const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        // Crear conexión a la base de datos
        const dbPath = path.join(__dirname, 'audacity.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error al conectar con la base de datos:', err.message);
            } else {
                console.log('✅ Conectado a la base de datos SQLite');
                this.createTables();
            }
        });
    }

    createTables() {
        // Crear tabla de saldos
        this.db.run(`
            CREATE TABLE IF NOT EXISTS balances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                counter_name TEXT UNIQUE NOT NULL,
                balance REAL NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error al crear tabla balances:', err.message);
            } else {
                console.log('✅ Tabla balances creada/verificada');
                this.initializeBalances();
            }
        });

        // Crear tabla de operaciones
        this.db.run(`
            CREATE TABLE IF NOT EXISTS operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                counter_name TEXT,
                amount REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error al crear tabla operations:', err.message);
            } else {
                console.log('✅ Tabla operations creada/verificada');
            }
        });

        // Crear tabla de bloqueos
        this.db.run(`
            CREATE TABLE IF NOT EXISTS locks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                counter_name TEXT UNIQUE NOT NULL,
                locked_by TEXT,
                locked_at DATETIME,
                is_global INTEGER DEFAULT 0
            )
        `, (err) => {
            if (err) {
                console.error('❌ Error al crear tabla locks:', err.message);
            } else {
                console.log('✅ Tabla locks creada/verificada');
            }
        });
    }

    initializeBalances() {
        // Verificar si ya existen saldos
        this.db.get("SELECT COUNT(*) as count FROM balances", (err, row) => {
            if (err) {
                console.error('❌ Error al verificar saldos:', err.message);
                return;
            }

            if (row.count === 0) {
                // Insertar saldos iniciales
                const initialBalances = [
                    { counter_name: 'bank', balance: 0 },
                    { counter_name: 'gallo', balance: 10000 },
                    { counter_name: 'leon', balance: 10000 },
                    { counter_name: 'perro', balance: 10000 },
                    { counter_name: 'mano', balance: 10000 },
                    { counter_name: 'estrella', balance: 10000 }
                ];

                const stmt = this.db.prepare("INSERT INTO balances (counter_name, balance) VALUES (?, ?)");
                
                initialBalances.forEach(balance => {
                    stmt.run([balance.counter_name, balance.balance], (err) => {
                        if (err) {
                            console.error(`❌ Error al insertar saldo ${balance.counter_name}:`, err.message);
                        }
                    });
                });

                stmt.finalize();
                console.log('✅ Saldos iniciales insertados');
            } else {
                console.log('✅ Saldos ya existen en la base de datos');
            }
        });
    }

    // Obtener todos los saldos
    getBalances(callback) {
        this.db.all("SELECT counter_name, balance FROM balances", (err, rows) => {
            if (err) {
                console.error('❌ Error al obtener saldos:', err.message);
                callback(err, null);
                return;
            }

            const balances = {};
            rows.forEach(row => {
                balances[row.counter_name] = row.balance;
            });

            callback(null, balances);
        });
    }

    // Actualizar saldo de un contador
    updateBalance(counterName, newBalance, callback) {
        this.db.run(
            "UPDATE balances SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE counter_name = ?",
            [newBalance, counterName],
            function(err) {
                if (err) {
                    console.error(`❌ Error al actualizar saldo ${counterName}:`, err.message);
                    callback(err);
                } else {
                    console.log(`✅ Saldo ${counterName} actualizado a ${newBalance}`);
                    callback(null);
                }
            }
        );
    }

    // Actualizar múltiples saldos
    updateMultipleBalances(balances, callback) {
        const stmt = this.db.prepare("UPDATE balances SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE counter_name = ?");
        
        let completed = 0;
        const total = Object.keys(balances).length;
        let hasError = false;

        Object.entries(balances).forEach(([counterName, balance]) => {
            stmt.run([balance, counterName], (err) => {
                if (err && !hasError) {
                    console.error(`❌ Error al actualizar saldo ${counterName}:`, err.message);
                    hasError = true;
                    callback(err);
                    return;
                }

                completed++;
                if (completed === total && !hasError) {
                    stmt.finalize();
                    console.log('✅ Todos los saldos actualizados');
                    callback(null);
                }
            });
        });
    }

    // Registrar operación
    logOperation(userId, userName, operationType, counterName, amount, description, callback) {
        this.db.run(
            "INSERT INTO operations (user_id, user_name, operation_type, counter_name, amount, description) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, userName, operationType, counterName, amount, description],
            function(err) {
                if (err) {
                    console.error('❌ Error al registrar operación:', err.message);
                    callback(err);
                } else {
                    console.log(`✅ Operación registrada: ${operationType} por ${userName}`);
                    callback(null);
                }
            }
        );
    }

    // Obtener últimas operaciones
    getRecentOperations(limit = 10, callback) {
        this.db.all(
            "SELECT * FROM operations ORDER BY created_at DESC LIMIT ?",
            [limit],
            (err, rows) => {
                if (err) {
                    console.error('❌ Error al obtener operaciones:', err.message);
                    callback(err, null);
                    return;
                }

                callback(null, rows);
            }
        );
    }

    // Gestionar bloqueos
    setLock(counterName, lockedBy, isGlobal = false, callback) {
        this.db.run(
            "INSERT OR REPLACE INTO locks (counter_name, locked_by, locked_at, is_global) VALUES (?, ?, CURRENT_TIMESTAMP, ?)",
            [counterName, lockedBy, isGlobal ? 1 : 0],
            function(err) {
                if (err) {
                    console.error(`❌ Error al establecer bloqueo ${counterName}:`, err.message);
                    callback(err);
                } else {
                    console.log(`✅ Bloqueo establecido: ${counterName} por ${lockedBy}`);
                    callback(null);
                }
            }
        );
    }

    // Liberar bloqueo
    releaseLock(counterName, callback) {
        this.db.run(
            "DELETE FROM locks WHERE counter_name = ?",
            [counterName],
            function(err) {
                if (err) {
                    console.error(`❌ Error al liberar bloqueo ${counterName}:`, err.message);
                    callback(err);
                } else {
                    console.log(`✅ Bloqueo liberado: ${counterName}`);
                    callback(null);
                }
            }
        );
    }

    // Obtener bloqueos actuales
    getLocks(callback) {
        this.db.all("SELECT * FROM locks", (err, rows) => {
            if (err) {
                console.error('❌ Error al obtener bloqueos:', err.message);
                callback(err, null);
                return;
            }

            const locks = {};
            rows.forEach(row => {
                locks[row.counter_name] = {
                    lockedBy: row.locked_by,
                    lockedAt: row.locked_at,
                    isGlobal: row.is_global === 1
                };
            });

            callback(null, locks);
        });
    }

    // Cerrar conexión
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error al cerrar base de datos:', err.message);
                } else {
                    console.log('✅ Conexión a base de datos cerrada');
                }
            });
        }
    }
}

module.exports = Database;

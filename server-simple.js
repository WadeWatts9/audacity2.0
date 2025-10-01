const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicializar base de datos
const db = new sqlite3.Database('./audacity.db');

// Crear tablas si no existen
db.serialize(() => {
    // Tabla de saldos
    db.run(`
        CREATE TABLE IF NOT EXISTS balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            counter_name TEXT UNIQUE NOT NULL,
            balance REAL NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabla de operaciones
    db.run(`
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
    `);

    // Insertar saldos iniciales si no existen
    db.get("SELECT COUNT(*) as count FROM balances", (err, row) => {
        if (err) {
            console.error('Error al verificar saldos:', err);
            return;
        }

        if (row.count === 0) {
            const initialBalances = [
                { counter_name: 'bank', balance: 0 },
                { counter_name: 'gallo', balance: 10000 },
                { counter_name: 'leon', balance: 10000 },
                { counter_name: 'perro', balance: 10000 },
                { counter_name: 'mano', balance: 10000 },
                { counter_name: 'estrella', balance: 10000 }
            ];

            const stmt = db.prepare("INSERT INTO balances (counter_name, balance) VALUES (?, ?)");
            initialBalances.forEach(balance => {
                stmt.run([balance.counter_name, balance.balance]);
            });
            stmt.finalize();
            console.log('✅ Saldos iniciales insertados');
        }
    });
});

// Almacenar usuarios conectados
const connectedUsers = new Map();

// Obtener saldos actuales
function getBalances(callback) {
    db.all("SELECT counter_name, balance FROM balances", (err, rows) => {
        if (err) {
            console.error('Error al obtener saldos:', err);
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

// Actualizar saldo
function updateBalance(counterName, newBalance, callback) {
    db.run(
        "UPDATE balances SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE counter_name = ?",
        [newBalance, counterName],
        function(err) {
            if (err) {
                console.error(`Error al actualizar saldo ${counterName}:`, err);
                callback(err);
            } else {
                console.log(`✅ Saldo ${counterName} actualizado a ${newBalance}`);
                callback(null);
            }
        }
    );
}

// Registrar operación
function logOperation(userId, userName, operationType, counterName, amount, description, callback) {
    db.run(
        "INSERT INTO operations (user_id, user_name, operation_type, counter_name, amount, description) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, userName, operationType, counterName, amount, description],
        function(err) {
            if (err) {
                console.error('Error al registrar operación:', err);
                callback(err);
            } else {
                console.log(`✅ Operación registrada: ${operationType} por ${userName}`);
                callback(null);
            }
        }
    );
}

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    // Enviar saldos actuales al usuario recién conectado
    getBalances((err, balances) => {
        if (!err && balances) {
            socket.emit('balances_update', balances);
            console.log('📊 Enviando saldos actuales al nuevo usuario:', balances);
        }
    });

    // Autenticación
    socket.on('authenticate', (data) => {
        const { username, password } = data;
        
        // Usuarios del sistema
        const users = {
            'alan': { password: '20243', role: 'admin', name: 'Administrador' },
            'contador_gallo': { password: 'galloazul', role: 'counter', name: 'Contador Gallo', counter: 'gallo' },
            'contador_leon': { password: 'reyleon', role: 'counter', name: 'Contador León', counter: 'leon' },
            'contador_perro': { password: 'dalmata', role: 'counter', name: 'Contador Perro', counter: 'perro' },
            'contador_mano': { password: 'guante', role: 'counter', name: 'Contador Mano', counter: 'mano' },
            'contador_estrella': { password: 'brillante', role: 'counter', name: 'Contador Estrella', counter: 'estrella' }
        };

        const user = users[username];
        
        if (user && user.password === password) {
            connectedUsers.set(socket.id, {
                username: username,
                role: user.role,
                name: user.name,
                counter: user.counter
            });

            socket.emit('auth_success', {
                username: username,
                role: user.role,
                name: user.name,
                counter: user.counter
            });

            console.log(`✅ Usuario autenticado: ${username} (${user.role})`);
        } else {
            socket.emit('auth_error', { message: 'Credenciales inválidas' });
            console.log(`❌ Intento de autenticación fallido: ${username}`);
        }
    });

    // Operaciones financieras
    socket.on('operation', (data) => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) {
            socket.emit('error', { message: 'No autenticado' });
            return;
        }

        const { operation, counter, amount, targetCounter, percentage } = data;
        
        console.log(`🔄 Operación recibida: ${operation} en ${counter} por ${userData.username}`);

        // Obtener saldos actuales
        getBalances((err, currentBalances) => {
            if (err) {
                socket.emit('error', { message: 'Error al obtener saldos' });
                return;
            }

            let newBalances = { ...currentBalances };
            let operationDescription = '';

            // Realizar operación
            switch (operation) {
                case 'add':
                    newBalances[counter] += amount;
                    operationDescription = `Sumó $TDL ${amount} a ${counter}`;
                    break;
                case 'subtract':
                    newBalances[counter] = Math.max(0, newBalances[counter] - amount);
                    operationDescription = `Restó $TDL ${amount} de ${counter}`;
                    break;
                case 'set':
                    newBalances[counter] = amount;
                    operationDescription = `Estableció $TDL ${amount} en ${counter}`;
                    break;
                case 'add_percentage':
                    const addPercentageAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] += addPercentageAmount;
                    operationDescription = `Sumó ${percentage}% (${addPercentageAmount}) de su saldo a ${counter}`;
                    break;
                case 'subtract_percentage':
                    const subtractPercentageAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] = Math.max(0, newBalances[counter] - subtractPercentageAmount);
                    operationDescription = `Restó ${percentage}% (${subtractPercentageAmount}) de su saldo de ${counter}`;
                    break;
                case 'transfer':
                    const transferAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] -= transferAmount;
                    newBalances[targetCounter] += transferAmount;
                    operationDescription = `Transfirió ${percentage}% (${transferAmount}) de ${counter} a ${targetCounter}`;
                    break;
                case 'transfer_to_bank':
                    const transferToBankAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] -= transferToBankAmount;
                    newBalances.bank += transferToBankAmount;
                    operationDescription = `Transfirió ${percentage}% (${transferToBankAmount}) de ${counter} al banco`;
                    break;
                case 'duplicate':
                    newBalances[counter] *= 2;
                    operationDescription = `Duplicó el saldo de ${counter}`;
                    break;
                case 'halve':
                    newBalances[counter] = Math.floor(newBalances[counter] / 2);
                    operationDescription = `Redujo a la mitad el saldo de ${counter}`;
                    break;
                case 'set_specific_amounts':
                    newBalances = { ...newBalances, ...data.amounts };
                    operationDescription = 'Estableció montos específicos para todas las cuentas';
                    break;
                case 'set_bank_amount':
                    newBalances.bank = data.amount;
                    operationDescription = `Estableció el saldo del banco a $TDL ${data.amount}`;
                    break;
                case 'divide_bank':
                    const divideAmount = data.amount;
                    const perCounter = divideAmount / 5; // Dividir entre 5 contadores
                    newBalances.bank -= divideAmount;
                    newBalances.gallo += perCounter;
                    newBalances.leon += perCounter;
                    newBalances.perro += perCounter;
                    newBalances.mano += perCounter;
                    newBalances.estrella += perCounter;
                    operationDescription = `Dividió $TDL ${divideAmount} del banco entre todos los contadores`;
                    break;
                case 'reset_all':
                    newBalances = {
                        bank: 0,
                        gallo: 10000,
                        leon: 10000,
                        perro: 10000,
                        mano: 10000,
                        estrella: 10000
                    };
                    operationDescription = 'Reinició todos los saldos a valores iniciales';
                    break;
            }

            // Actualizar saldos en la base de datos
            const stmt = db.prepare("UPDATE balances SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE counter_name = ?");
            
            let completed = 0;
            const total = Object.keys(newBalances).length;
            let hasError = false;

            Object.entries(newBalances).forEach(([counterName, balance]) => {
                stmt.run([balance, counterName], (err) => {
                    if (err && !hasError) {
                        console.error(`Error al actualizar saldo ${counterName}:`, err);
                        hasError = true;
                        socket.emit('error', { message: 'Error al actualizar saldos' });
                        return;
                    }

                    completed++;
                    if (completed === total && !hasError) {
                        stmt.finalize();
                        
                        // Registrar operación
                        logOperation(
                            userData.username,
                            userData.name,
                            operation,
                            counter,
                            amount,
                            operationDescription,
                            (err) => {
                                if (err) console.error('Error al registrar operación:', err);
                            }
                        );

                        // Notificar a todos los clientes
                        io.emit('balances_update', newBalances);
                        console.log('✅ Saldos actualizados y enviados a todos los clientes:', newBalances);

                        socket.emit('operation_success', { message: 'Operación realizada correctamente' });
                    }
                });
            });
        });
    });

    // Solicitar actualización de saldos
    socket.on('request_balances_update', () => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) return;

        getBalances((err, balances) => {
            if (!err && balances) {
                socket.emit('balances_update', balances);
                io.emit('balances_refreshed', {
                    requestedBy: userData.name,
                    timestamp: new Date()
                });
                console.log(`🔄 Saldos actualizados por solicitud de ${userData.name}`);
            }
        });
    });

    // Desconexión
    socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            console.log(`👋 Usuario desconectado: ${userData.username}`);
            connectedUsers.delete(socket.id);
        }
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor AUDACITY ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Accede a: http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    db.close();
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    db.close();
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

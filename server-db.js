const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const Database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Inicializar base de datos
const db = new Database();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta de prueba
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Almacenar usuarios conectados
const connectedUsers = new Map();

// Sistema de bloqueo de operaciones (en memoria para rapidez)
let operationLocks = {
    gallo: null,
    leon: null,
    perro: null,
    mano: null,
    estrella: null
};

// Estado global de bloqueo del administrador
let globalLock = {
    isLocked: false,
    lockedBy: null,
    lockedAt: null
};

// Función para verificar si un contador está bloqueado
function isCounterLocked(counter) {
    // Si hay bloqueo global, solo el admin puede operar
    if (globalLock.isLocked) {
        return true;
    }
    return operationLocks[counter] !== null;
}

// Función para obtener el usuario que tiene bloqueado un contador
function getLockedBy(counter) {
    if (globalLock.isLocked) {
        return globalLock.lockedBy;
    }
    return operationLocks[counter];
}

// Función para verificar si el usuario puede operar en un contador
function canUserOperate(counter, userId, userRole) {
    // Si hay bloqueo global, solo el admin que lo inició puede operar
    if (globalLock.isLocked) {
        return userRole === 'admin' && globalLock.lockedBy === userId;
    }
    
    // Si no hay bloqueo global, verificar bloqueo individual
    const lockedBy = operationLocks[counter];
    return lockedBy === null || lockedBy === userId || userRole === 'admin';
}

// Función para verificar si el usuario puede transferir al banco
function canUserTransferToBank(userId, userRole) {
    // Los contadores siempre pueden transferir al banco si no hay bloqueo global
    if (globalLock.isLocked) {
        return userRole === 'admin' && globalLock.lockedBy === userId;
    }
    return true; // Los contadores pueden transferir al banco libremente
}

// Función para bloquear un contador
function lockCounter(counter, userId) {
    operationLocks[counter] = userId;
    db.setLock(counter, userId, false, (err) => {
        if (err) console.error('Error al guardar bloqueo en BD:', err);
    });
}

// Función para liberar un contador
function unlockCounter(counter) {
    operationLocks[counter] = null;
    db.releaseLock(counter, (err) => {
        if (err) console.error('Error al liberar bloqueo en BD:', err);
    });
}

// Función para bloquear globalmente
function lockGlobal(userId) {
    globalLock.isLocked = true;
    globalLock.lockedBy = userId;
    globalLock.lockedAt = new Date();
    db.setLock('global', userId, true, (err) => {
        if (err) console.error('Error al guardar bloqueo global en BD:', err);
    });
}

// Función para liberar bloqueo global
function unlockGlobal() {
    globalLock.isLocked = false;
    globalLock.lockedBy = null;
    globalLock.lockedAt = null;
    db.releaseLock('global', (err) => {
        if (err) console.error('Error al liberar bloqueo global en BD:', err);
    });
}

// Función para actualizar saldos y notificar a todos
function updateBalancesAndNotify(newBalances, operation = null) {
    db.updateMultipleBalances(newBalances, (err) => {
        if (err) {
            console.error('❌ Error al actualizar saldos en BD:', err);
            return;
        }

        // Notificar a todos los clientes
        io.emit('balances_update', newBalances);
        console.log('✅ Saldos actualizados y enviados a todos los clientes:', newBalances);

        // Si hay una operación, registrarla
        if (operation) {
            db.logOperation(
                operation.userId,
                operation.userName,
                operation.type,
                operation.counter,
                operation.amount,
                operation.description,
                (err) => {
                    if (err) console.error('Error al registrar operación:', err);
                }
            );
        }
    });
}

// Función para obtener saldos actuales
function getCurrentBalances(callback) {
    db.getBalances((err, balances) => {
        if (err) {
            console.error('❌ Error al obtener saldos:', err);
            callback(err, null);
            return;
        }
        callback(null, balances);
    });
}

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    // Enviar saldos actuales al usuario recién conectado
    getCurrentBalances((err, balances) => {
        if (!err && balances) {
            socket.emit('balances_update', balances);
            console.log('📊 Enviando saldos actuales al nuevo usuario:', balances);
        }
    });

    // Enviar estado de bloqueos
    socket.emit('locks_update', {
        operationLocks: operationLocks,
        globalLock: globalLock
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

    // Inicio de operaciones
    socket.on('start_operations', (data) => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) {
            socket.emit('error', { message: 'No autenticado' });
            return;
        }

        const { counter } = data;
        
        if (counter === 'global') {
            if (userData.role === 'admin') {
                lockGlobal(userData.username);
                io.emit('global_lock_changed', {
                    isLocked: true,
                    lockedBy: userData.username,
                    lockedAt: globalLock.lockedAt
                });
                console.log(`🔒 Bloqueo global iniciado por ${userData.username}`);
            }
        } else {
            if (canUserOperate(counter, userData.username, userData.role)) {
                lockCounter(counter, userData.username);
                io.emit('lock_changed', {
                    counter: counter,
                    lockedBy: userData.username
                });
                console.log(`🔒 Contador ${counter} bloqueado por ${userData.username}`);
            } else {
                socket.emit('error', { message: 'No puedes operar en este contador' });
            }
        }
    });

    // Fin de operaciones
    socket.on('end_operations', (data) => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) {
            socket.emit('error', { message: 'No autenticado' });
            return;
        }

        const { counter } = data;
        
        if (counter === 'global') {
            if (userData.role === 'admin' && globalLock.lockedBy === userData.username) {
                unlockGlobal();
                io.emit('global_lock_changed', {
                    isLocked: false,
                    lockedBy: null,
                    lockedAt: null
                });
                console.log(`🔓 Bloqueo global liberado por ${userData.username}`);
            }
        } else {
            if (operationLocks[counter] === userData.username || userData.role === 'admin') {
                unlockCounter(counter);
                io.emit('lock_changed', {
                    counter: counter,
                    lockedBy: null
                });
                console.log(`🔓 Contador ${counter} liberado por ${userData.username}`);
            }
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
        
        // Verificar permisos
        if (!canUserOperate(counter, userData.username, userData.role)) {
            socket.emit('error', { message: 'No tienes permisos para operar en este contador' });
            return;
        }

        // Obtener saldos actuales
        getCurrentBalances((err, currentBalances) => {
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
                case 'transfer':
                    const transferAmount = Math.min(amount, newBalances[counter]);
                    newBalances[counter] -= transferAmount;
                    newBalances[targetCounter] += transferAmount;
                    operationDescription = `Transfirió $TDL ${transferAmount} de ${counter} a ${targetCounter}`;
                    break;
                case 'transfer_percentage':
                    const percentageAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] -= percentageAmount;
                    newBalances[targetCounter] += percentageAmount;
                    operationDescription = `Transfirió ${percentage}% (${percentageAmount}) de ${counter} a ${targetCounter}`;
                    break;
                case 'deposit_to_bank':
                    const depositAmount = (newBalances[counter] * percentage) / 100;
                    newBalances[counter] -= depositAmount;
                    newBalances.bank += depositAmount;
                    operationDescription = `Depositó ${percentage}% (${depositAmount}) de ${counter} al banco`;
                    break;
                case 'duplicate':
                    newBalances[counter] *= 2;
                    operationDescription = `Duplicó el saldo de ${counter}`;
                    break;
                case 'halve':
                    newBalances[counter] = Math.floor(newBalances[counter] / 2);
                    operationDescription = `Redujo a la mitad el saldo de ${counter}`;
                    break;
                case 'swap':
                    const temp = newBalances[counter];
                    newBalances[counter] = newBalances[targetCounter];
                    newBalances[targetCounter] = temp;
                    operationDescription = `Intercambió saldos entre ${counter} y ${targetCounter}`;
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

            // Actualizar saldos y notificar
            updateBalancesAndNotify(newBalances, {
                userId: userData.username,
                userName: userData.name,
                type: operation,
                counter: counter,
                amount: amount,
                description: operationDescription
            });

            socket.emit('operation_success', { message: 'Operación realizada correctamente' });
        });
    });

    // Solicitar actualización de saldos
    socket.on('request_balances_update', () => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) return;

        getCurrentBalances((err, balances) => {
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

    // Obtener operaciones recientes
    socket.on('get_recent_operations', () => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) return;

        db.getRecentOperations(10, (err, operations) => {
            if (!err) {
                socket.emit('recent_operations', operations);
            }
        });
    });

    // Finalizar operación
    socket.on('finish_operation', (data) => {
        const userData = connectedUsers.get(socket.id);
        if (!userData) return;

        const { counter } = data;
        
        if (operationLocks[counter] === userData.username || userData.role === 'admin') {
            unlockCounter(counter);
            io.emit('lock_changed', {
                counter: counter,
                lockedBy: null
            });
            
            io.emit('operation_finished', {
                counter: counter,
                finishedBy: userData.name,
                timestamp: new Date()
            });
            
            console.log(`✅ Operación finalizada en ${counter} por ${userData.name}`);
        }
    });

    // Desconexión
    socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            console.log(`👋 Usuario desconectado: ${userData.username}`);
            
            // Liberar todos los bloqueos del usuario
            Object.keys(operationLocks).forEach(counter => {
                if (operationLocks[counter] === userData.username) {
                    unlockCounter(counter);
                    io.emit('lock_changed', {
                        counter: counter,
                        lockedBy: null
                    });
                }
            });
            
            // Si era admin y tenía bloqueo global, liberarlo
            if (userData.role === 'admin' && globalLock.lockedBy === userData.username) {
                unlockGlobal();
                io.emit('global_lock_changed', {
                    isLocked: false,
                    lockedBy: null,
                    lockedAt: null
                });
            }
            
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

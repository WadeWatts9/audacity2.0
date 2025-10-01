const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

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

// Ruta de prueba
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// Almacenar saldos en memoria
let balances = {
    bank: 0,
    gallo: 10000,
    leon: 10000,
    perro: 10000,
    mano: 10000,
    estrella: 10000
};

// Almacenar usuarios conectados
const connectedUsers = new Map();

// Sistema de bloqueo de operaciones
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
}

// Función para desbloquear un contador
function unlockCounter(counter) {
    operationLocks[counter] = null;
}

// Función para iniciar bloqueo global (solo admin)
function startGlobalLock(userId) {
    globalLock.isLocked = true;
    globalLock.lockedBy = userId;
    globalLock.lockedAt = new Date();
    
    // Desbloquear todos los contadores individuales
    Object.keys(operationLocks).forEach(counter => {
        operationLocks[counter] = null;
    });
}

// Función para finalizar bloqueo global (solo admin)
function endGlobalLock(userId) {
    if (globalLock.lockedBy === userId) {
        globalLock.isLocked = false;
        globalLock.lockedBy = null;
        globalLock.lockedAt = null;
    }
}

// Manejar conexiones WebSocket
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Enviar saldos actuales al usuario que se conecta
    socket.emit('balances_update', balances);
    
    // Enviar estado de bloqueos
    socket.emit('locks_update', operationLocks);
    
    // Enviar estado global de bloqueo
    socket.emit('global_lock_update', globalLock);

    // Manejar login
    socket.on('user_login', (userData) => {
        connectedUsers.set(socket.id, userData);
        socket.broadcast.emit('user_connected', userData);
        console.log(`Usuario ${userData.username} conectado`);
        
        // Enviar saldos actuales al usuario que se conecta
        socket.emit('balances_update', balances);
        socket.emit('locks_update', operationLocks);
        socket.emit('global_lock_update', globalLock);
        console.log(`📊 Enviando saldos actuales a ${userData.username}:`, balances);
    });

    // Manejar inicio de operaciones
    socket.on('start_operations', (data) => {
        const userData = connectedUsers.get(socket.id);
        const userName = userData ? userData.username : 'Usuario desconocido';
        const userRole = userData ? userData.role : 'counter';
        const { counter } = data;
        
        // Si es admin, iniciar bloqueo global
        if (userRole === 'admin') {
            if (globalLock.isLocked && globalLock.lockedBy !== userName) {
                socket.emit('operation_error', {
                    message: `El sistema está siendo usado por ${globalLock.lockedBy}`,
                    type: 'lock_error'
                });
                return;
            }
            
            // Iniciar bloqueo global
            startGlobalLock(userName);
            
            console.log(`🔒 ADMIN ${userName} inició operaciones globales (incluye banco central)`);
            
            // Notificar a todos los clientes
            io.emit('global_operations_started', {
                user: userName,
                timestamp: new Date().toLocaleTimeString(),
                includesBank: true
            });
            
            // Enviar estado actualizado
            io.emit('locks_update', operationLocks);
            io.emit('global_lock_update', globalLock);
            return;
        }
        
        // Para contadores normales, verificar si pueden operar
        if (!canUserOperate(counter, userName, userRole)) {
            const lockedBy = getLockedBy(counter);
            socket.emit('operation_error', {
                message: `El contador ${counter} está siendo usado por ${lockedBy}`,
                type: 'lock_error'
            });
            return;
        }
        
        // Bloquear el contador individual
        lockCounter(counter, userName);
        
        // Desbloquear banco para este contador si no está bloqueado globalmente
        if (!globalLock.isLocked && !operationLocks['bank']) {
            operationLocks['bank'] = userName;
        }
        
        console.log(`🔒 Usuario ${userName} inició operaciones en ${counter} (banco desbloqueado)`);
        
        // Notificar a todos los clientes
        io.emit('operations_started', {
            user: userName,
            counter: counter,
            timestamp: new Date().toLocaleTimeString(),
            bankUnlocked: !globalLock.isLocked
        });
        
        // Enviar estado actualizado de bloqueos
        io.emit('locks_update', operationLocks);
    });

    // Manejar fin de operaciones
    socket.on('end_operations', (data) => {
        const userData = connectedUsers.get(socket.id);
        const userName = userData ? userData.username : 'Usuario desconocido';
        const userRole = userData ? userData.role : 'counter';
        const { counter } = data;
        
        // Si es admin, finalizar bloqueo global
        if (userRole === 'admin') {
            if (!globalLock.isLocked || globalLock.lockedBy !== userName) {
                socket.emit('operation_error', {
                    message: `No tienes operaciones globales activas`,
                    type: 'permission_error'
                });
                return;
            }
            
            // Finalizar bloqueo global
            endGlobalLock(userName);
            
            console.log(`🔓 ADMIN ${userName} finalizó operaciones globales (banco central liberado)`);
            
            // Notificar a todos los clientes
            io.emit('global_operations_ended', {
                user: userName,
                timestamp: new Date().toLocaleTimeString(),
                includesBank: true
            });
            
            // Enviar estado actualizado
            io.emit('locks_update', operationLocks);
            io.emit('global_lock_update', globalLock);
            return;
        }
        
        // Para contadores normales, verificar permisos
        if (getLockedBy(counter) !== userName) {
            socket.emit('operation_error', {
                message: `No tienes permisos para finalizar operaciones en ${counter}`,
                type: 'permission_error'
            });
            return;
        }
        
        // Desbloquear el contador individual
        unlockCounter(counter);
        
        // Liberar banco si este usuario lo tenía bloqueado
        if (operationLocks['bank'] === userName) {
            operationLocks['bank'] = null;
        }
        
        console.log(`🔓 Usuario ${userName} finalizó operaciones en ${counter} (banco liberado)`);
        
        // Notificar a todos los clientes
        io.emit('operations_ended', {
            user: userName,
            counter: counter,
            timestamp: new Date().toLocaleTimeString(),
            bankReleased: true
        });
        
        // Enviar estado actualizado de bloqueos
        io.emit('locks_update', operationLocks);
    });

    // Manejar actualización de saldos
    socket.on('update_balance', (data) => {
        const { counter, amount, operation, targetCounter } = data;
        const userData = connectedUsers.get(socket.id);
        const userName = userData ? userData.username : 'Usuario desconocido';
        const userRole = userData ? userData.role : 'counter';
        
        // Si es transferencia al banco, usar validación especial
        if (targetCounter === 'bank' && operation === 'deposit') {
            if (!canUserTransferToBank(userName, userRole)) {
                const lockedBy = globalLock.isLocked ? globalLock.lockedBy : 'Sistema';
                socket.emit('operation_error', {
                    message: `El banco central está siendo usado por ${lockedBy}`,
                    type: 'lock_error'
                });
                return;
            }
        } else if (targetCounter && operation === 'deposit') {
            // Si es transferencia a otra cuenta, desbloquearla automáticamente
            if (!operationLocks[targetCounter] || operationLocks[targetCounter] === userName) {
                operationLocks[targetCounter] = userName;
                console.log(`🔓 Cuenta ${targetCounter} desbloqueada automáticamente para ${userName}`);
            }
            
            // Verificar si el usuario puede operar en el contador origen
            if (!canUserOperate(counter, userName, userRole)) {
                const lockedBy = getLockedBy(counter);
                socket.emit('operation_error', {
                    message: `El contador ${counter} está siendo usado por ${lockedBy}`,
                    type: 'lock_error'
                });
                return;
            }
        } else if (operation === 'transfer') {
            // Para transferencias entre contadores, verificar ambos contadores
            const fromCounter = data.fromCounter;
            const toCounter = data.toCounter;
            
            // Verificar si el usuario puede operar en el contador origen
            if (!canUserOperate(fromCounter, userName, userRole)) {
                const lockedBy = getLockedBy(fromCounter);
                socket.emit('operation_error', {
                    message: `El contador ${fromCounter} está siendo usado por ${lockedBy}`,
                    type: 'lock_error'
                });
                return;
            }
            
            // Desbloquear contador destino si es necesario
            if (!operationLocks[toCounter] || operationLocks[toCounter] === userName) {
                operationLocks[toCounter] = userName;
                console.log(`🔓 Cuenta ${toCounter} desbloqueada automáticamente para transferencia de ${userName}`);
            }
        } else {
            // Verificar si el usuario puede operar en este contador
            if (!canUserOperate(counter, userName, userRole)) {
                const lockedBy = getLockedBy(counter);
                socket.emit('operation_error', {
                    message: `El contador ${counter} está siendo usado por ${lockedBy}`,
                    type: 'lock_error'
                });
                return;
            }
        }
        
        console.log(`Usuario ${userName} realizó operación: ${operation} en ${counter} por ${amount}`);
        
        if (operation === 'add') {
            balances[counter] += amount;
        } else if (operation === 'subtract') {
            balances[counter] = Math.max(0, balances[counter] - amount);
        } else if (operation === 'set') {
            balances[counter] = amount;
        } else if (operation === 'transfer') {
            balances[data.fromCounter] -= amount;
            balances[data.toCounter] += amount;
        } else if (operation === 'swap') {
            const temp = balances[data.fromCounter];
            balances[data.fromCounter] = balances[data.toCounter];
            balances[data.toCounter] = temp;
        } else if (operation === 'reset') {
            balances = {
                bank: 0,
                gallo: 10000,
                leon: 10000,
                perro: 10000,
                mano: 10000,
                estrella: 10000
            };
        }

        // Enviar actualización a TODOS los clientes conectados
        console.log('🔄 Enviando actualización a todos los clientes...');
        io.emit('balances_update', balances);
        
        // Notificar a todos sobre la operación realizada
        io.emit('operation_notification', {
            user: userName,
            operation: operation,
            counter: counter,
            amount: amount,
            timestamp: new Date().toLocaleTimeString()
        });
        
        console.log('✅ Saldos actualizados y enviados a todos los clientes:', balances);
        console.log(`👥 Clientes conectados: ${io.engine.clientsCount}`);
    });

    // Manejar solicitud de actualización de saldos
    socket.on('request_balances_update', () => {
        const userData = connectedUsers.get(socket.id);
        const userName = userData ? userData.username : 'Usuario desconocido';
        
        console.log(`Usuario ${userName} solicitó actualización de saldos`);
        
        // Enviar saldos actuales a todos los clientes
        io.emit('balances_update', balances);
        
        // Notificar que se actualizaron los saldos
        io.emit('balances_refreshed', {
            user: userName,
            timestamp: new Date().toLocaleTimeString(),
            message: `${userName} solicitó sincronización de saldos`
        });
        
        console.log(`🔄 Saldos actualizados por solicitud de ${userName}`);
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        const userData = connectedUsers.get(socket.id);
        if (userData) {
            // Si el usuario tenía bloqueo global, liberarlo
            if (globalLock.isLocked && globalLock.lockedBy === userData.username) {
                endGlobalLock(userData.username);
                console.log(`🔓 Bloqueo global liberado por desconexión de ${userData.username}`);
            }
            
            // Desbloquear todos los contadores que tenía bloqueados este usuario
            Object.keys(operationLocks).forEach(counter => {
                if (getLockedBy(counter) === userData.username) {
                    unlockCounter(counter);
                    console.log(`🔓 Contador ${counter} desbloqueado por desconexión de ${userData.username}`);
                }
            });
            
            socket.broadcast.emit('user_disconnected', userData);
            connectedUsers.delete(socket.id);
            console.log(`Usuario ${userData.username} desconectado`);
            
            // Enviar estado actualizado de bloqueos
            io.emit('locks_update', operationLocks);
            io.emit('global_lock_update', globalLock);
        }
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor AUDACITY ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Accede a: http://localhost:${PORT}`);
    console.log(`📱 Modo desarrollo local - Sin redirecciones`);
});

module.exports = { app, server, io };

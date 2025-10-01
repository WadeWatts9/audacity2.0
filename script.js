// Sistema de autenticación y gestión del juego AUDACITY con WebSockets y bloqueo de operaciones

class AudacityGame {
    constructor() {
        this.users = {
            'alan': { password: '20243', role: 'admin', name: 'Administrador' },
            'contador_gallo': { password: 'galloazul', role: 'counter', name: 'Contador Gallo', counter: 'gallo' },
            'contador_leon': { password: 'reyleon', role: 'counter', name: 'Contador León', counter: 'leon' },
            'contador_perro': { password: 'dalmata', role: 'counter', name: 'Contador Perro', counter: 'perro' },
            'contador_mano': { password: 'guante', role: 'counter', name: 'Contador Mano', counter: 'mano' },
            'contador_estrella': { password: 'brillante', role: 'counter', name: 'Contador Estrella', counter: 'estrella' }
        };
        
        this.balances = {
            bank: 0,
            gallo: 10000,
            leon: 10000,
            perro: 10000,
            mano: 10000,
            estrella: 10000
        };
        
        this.currentUser = null;
        this.socket = null;
        this.operations = [];
        this.operationLocks = {};
        this.globalLock = {
            isLocked: false,
            lockedBy: null,
            lockedAt: null
        };
        this.operationHistory = []; // Array para almacenar las últimas 10 operaciones
        
        this.loadOperations();
        this.initializeEventListeners();
        this.initializeSocket();
    }

    initializeSocket() {
        // Conectar a WebSocket
        this.socket = io();
        
        // Verificar conexión
        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor WebSocket');
            this.showNotification('Conectado al servidor', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Desconectado del servidor WebSocket');
            this.showNotification('Desconectado del servidor', 'error');
        });
        
        // Escuchar actualizaciones de saldos
        this.socket.on('balances_update', (balances) => {
            console.log('📊 Recibida actualización de saldos:', balances);
            this.balances = balances;
            this.updateBalances();
        });

        // Escuchar actualizaciones de bloqueos
        this.socket.on('locks_update', (locks) => {
            console.log('🔒 Recibida actualización de bloqueos:', locks);
            this.operationLocks = locks;
            this.updateLockStatus();
        });

        // Escuchar actualizaciones de bloqueo global
        this.socket.on('global_lock_update', (globalLock) => {
            console.log('🌐 Recibida actualización de bloqueo global:', globalLock);
            this.globalLock = globalLock;
            this.updateGlobalLockStatus();
        });

        // Escuchar notificaciones de usuarios conectados
        this.socket.on('user_connected', (userData) => {
            this.showNotification(`${userData.name} se ha conectado`, 'info');
        });

        this.socket.on('user_disconnected', (userData) => {
            this.showNotification(`${userData.name} se ha desconectado`, 'info');
        });

        // Escuchar notificaciones de operaciones
        this.socket.on('operation_notification', (data) => {
            const operationText = this.getOperationText(data.operation);
            const message = `💳 ${data.user} ${operationText} en ${this.getCounterName(data.counter)} por $${data.amount.toLocaleString()}`;
            this.showNotification(message, 'success');
            
            // Agregar al historial
            this.addToOperationHistory({
                icon: '💳',
                message: message,
                time: new Date().toLocaleTimeString()
            });
        });

        // Escuchar notificaciones de inicio de operaciones
        this.socket.on('operations_started', (data) => {
            const message = `🔒 ${data.user} comenzó a operar en ${this.getCounterName(data.counter)} - Contador bloqueado`;
            this.showNotification(message, 'warning');
            
            // Agregar al historial
            this.addToOperationHistory({
                icon: '🔒',
                message: message,
                time: new Date().toLocaleTimeString()
            });
        });

        // Escuchar notificaciones de fin de operaciones
        this.socket.on('operations_ended', (data) => {
            const message = `🔓 ${data.user} terminó operaciones en ${this.getCounterName(data.counter)} - Contador liberado`;
            this.showNotification(message, 'success');
            
            // Agregar al historial
            this.addToOperationHistory({
                icon: '🔓',
                message: message,
                time: new Date().toLocaleTimeString()
            });
        });

        // Escuchar notificaciones de inicio de operaciones globales
        this.socket.on('global_operations_started', (data) => {
            const message = data.includesBank 
                ? `🔒 ${data.user} inició operaciones globales - Sistema bloqueado (incluye banco central)`
                : `🔒 ${data.user} inició operaciones globales - Solo el admin puede operar`;
            this.showNotification(message, 'warning');
        });

        // Escuchar notificaciones de fin de operaciones globales
        this.socket.on('global_operations_ended', (data) => {
            const message = data.includesBank 
                ? `🔓 ${data.user} finalizó operaciones globales - Sistema liberado (banco central disponible)`
                : `🔓 ${data.user} finalizó operaciones globales - Todos pueden operar`;
            this.showNotification(message, 'success');
        });

        // Escuchar notificaciones de actualización de saldos
        this.socket.on('balances_refreshed', (data) => {
            this.showNotification(`💰 ${data.user} solicitó actualización de saldos - Datos sincronizados`, 'info');
        });

        // Escuchar errores de operación
        this.socket.on('operation_error', (data) => {
            this.showNotification(data.message, 'error');
        });
    }

    initializeEventListeners() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Dashboard
        document.getElementById('dashboardBtn').addEventListener('click', () => {
            this.showDashboard();
        });

        // Botón para volver al juego
        document.getElementById('backToGameBtn').addEventListener('click', () => {
            this.showGameScreen();
        });

        // Botones de administración
        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAllBalances();
        });

        document.getElementById('setAmountBtn').addEventListener('click', () => {
            this.showAmountModal();
        });

        document.getElementById('swapBalancesBtn').addEventListener('click', () => {
            this.showSwapModal();
        });

        // Aplicar montos
        document.getElementById('applyAmountsBtn').addEventListener('click', () => {
            this.applyAmounts();
        });

        // Aplicar intercambio
        document.getElementById('applySwapBtn').addEventListener('click', () => {
            this.applySwap();
        });

        // Cerrar modales
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = {
                username,
                ...this.users[username]
            };
            
            // Notificar al servidor sobre el login
            this.socket.emit('user_login', this.currentUser);
            
            this.logOperation(`Usuario ${this.currentUser ? this.currentUser.name : 'Usuario'} inició sesión`);
            this.showGameScreen();
            this.setupUserInterface();
            this.showNotification(`Bienvenido, ${this.currentUser ? this.currentUser.name : 'Usuario'}`, 'success');
        } else {
            errorDiv.textContent = 'Usuario o contraseña incorrectos';
            errorDiv.style.display = 'block';
        }
    }

    handleLogout() {
        this.socket.emit('user_logout', this.currentUser);
        this.currentUser = null;
        this.showLoginScreen();
        this.showNotification('Sesión cerrada correctamente', 'success');
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showGameScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('currentUserRole').textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Contador';
        
        // Mostrar nombre del usuario encima del botón Cerrar Sesión
        this.updateUserDisplay();
        
        // Mostrar bienvenida personalizada en el header
        const userWelcomeElement = document.getElementById('userWelcome');
        if (userWelcomeElement) {
            if (this.currentUser.role === 'admin') {
                userWelcomeElement.textContent = `Bienvenido, Administrador ${this.currentUser ? this.currentUser.username : 'Usuario'}`;
            } else {
                const counterName = this.getCounterName(this.currentUser.counter);
                userWelcomeElement.textContent = `Bienvenido, ${this.currentUser ? this.currentUser.username : 'Usuario'} (${counterName})`;
            }
        }
        
        this.updateHeaderBankBalance();
        this.setupUserInterface();
    }

    setupUserInterface() {
        // Mostrar/ocultar panel de administración
        const adminPanel = document.getElementById('adminPanel');
        
        if (this.currentUser.role === 'admin') {
            adminPanel.style.display = 'block';
        } else {
            adminPanel.style.display = 'none';
        }

        // Actualizar display del usuario
        this.updateUserDisplay();

        // Configurar acciones para cada contador
        this.setupCounterActions();
    }

    setupCounterActions() {
        const counters = ['gallo', 'leon', 'perro', 'mano', 'estrella'];
        
        counters.forEach(counter => {
            const actionsDiv = document.getElementById(`actions-${counter}`);
            actionsDiv.innerHTML = '';

            if (this.currentUser.role === 'admin' || this.currentUser.counter === counter) {
                // Botones de control de operaciones
                if (this.currentUser.role === 'admin') {
                    // Botones especiales para admin
                    this.createActionButton(actionsDiv, '🚀 Inicio Global', 'start_global_operations', counter);
                    this.createActionButton(actionsDiv, '🏁 Fin Global', 'end_global_operations', counter);
                } else {
                    // Botones normales para contadores
                    this.createActionButton(actionsDiv, '🚀 Inicio de Operaciones', 'start_operations', counter);
                    this.createActionButton(actionsDiv, '🏁 Fin de Operaciones', 'end_operations', counter);
                }
                this.createActionButton(actionsDiv, '🔄 Actualizar Cuentas', 'refresh_balances', counter);
                
                // Separador visual
                const separator = document.createElement('div');
                separator.className = 'action-separator';
                separator.innerHTML = '<hr>';
                actionsDiv.appendChild(separator);
                
                // Botones de operaciones financieras
                this.createActionButton(actionsDiv, '💰 Sumar Monto', 'custom_add', counter);
                this.createActionButton(actionsDiv, '💸 Restar Monto', 'custom_subtract', counter);
                this.createActionButton(actionsDiv, '📈 Sumar % Propio', 'add_percentage_self', counter);
                this.createActionButton(actionsDiv, '📉 Restar % Propio', 'subtract_percentage_self', counter);
                this.createActionButton(actionsDiv, '🔄 Transferir %', 'custom_transfer', counter);
                this.createActionButton(actionsDiv, '🏦 Depositar % en Banco', 'deposit_to_bank', counter);
                this.createActionButton(actionsDiv, '⚡ Duplicar Saldo', 'duplicate', counter);
                this.createActionButton(actionsDiv, '⚠️ Perder Mitad', 'lose_half', counter);
                
                if (this.currentUser.role === 'admin') {
                    // Operaciones adicionales solo para admin
                    this.createActionButton(actionsDiv, '📈 Sumar % de Otro', 'custom_add_percentage', counter);
                    this.createActionButton(actionsDiv, '📉 Restar % de Otro', 'custom_subtract_percentage', counter);
                    this.createActionButton(actionsDiv, '🎯 Establecer Saldo', 'set_balance', counter);
                }
            } else {
                // Solo mostrar el saldo para otros contadores
                actionsDiv.innerHTML = '<p style="color: #666; text-align: center;">Solo lectura</p>';
            }
        });
    }

    createActionButton(container, text, action, counter, value) {
        const button = document.createElement('button');
        button.className = `action-btn btn-${action}`;
        button.textContent = text;
        button.addEventListener('click', () => {
            this.handleAction(action, counter, value);
        });
        container.appendChild(button);
    }

    handleAction(action, counter, value) {
        if (action === 'start_operations') {
            this.startOperations(counter);
        } else if (action === 'end_operations') {
            this.endOperations(counter);
        } else if (action === 'start_global_operations') {
            this.startGlobalOperations();
        } else if (action === 'end_global_operations') {
            this.endGlobalOperations();
        } else if (action === 'refresh_balances') {
            this.refreshBalances();
        } else if (action === 'transfer_to_bank') {
            this.showAmountModal('Transferir % al Banco', counter, 'transfer_to_bank');
        } else if (action === 'add_percentage_self') {
            this.showAmountModal('Sumar % del Propio Saldo', counter, 'add_percentage_self');
        } else if (action === 'subtract_percentage_self') {
            this.showAmountModal('Restar % del Propio Saldo', counter, 'subtract_percentage_self');
        } else if (action === 'custom_add') {
                this.showAmountModal('Sumar Monto', counter, 'add');
        } else if (action === 'custom_subtract') {
                this.showAmountModal('Restar Monto', counter, 'subtract');
        } else if (action === 'custom_transfer') {
                this.showTransferModal(counter);
        } else if (action === 'custom_add_percentage') {
                this.showAddPercentageModal(counter);
        } else if (action === 'custom_subtract_percentage') {
                this.showSubtractPercentageModal(counter);
        } else if (action === 'deposit_to_bank') {
                this.showDepositToBankModal(counter);
        } else if (action === 'duplicate') {
                this.duplicateBalance(counter);
        } else if (action === 'lose_half') {
                this.loseHalfBalance(counter);
        } else if (action === 'set_balance') {
                this.showSetBalanceModal(counter);
        } else if (action === 'add') {
            this.socket.emit('update_balance', {
                counter: counter,
                amount: value,
                operation: 'add'
            });
            this.showNotification(`Se sumaron $TDL ${value.toLocaleString()} al contador ${this.getCounterName(counter)}`, 'success');
        } else if (action === 'subtract') {
            if (this.balances[counter] >= value) {
                this.socket.emit('update_balance', {
                    counter: counter,
                    amount: value,
                    operation: 'subtract'
                });
                this.showNotification(`Se restaron $TDL ${value.toLocaleString()} del contador ${this.getCounterName(counter)}`, 'success');
            } else {
                this.showNotification('Saldo insuficiente', 'error');
                return;
            }
        }
    }

    startOperations(counter) {
        if (confirm(`¿Estás seguro de que quieres iniciar operaciones en el contador ${this.getCounterName(counter)}?`)) {
            this.socket.emit('start_operations', {
                counter: counter
            });
            this.logOperation(`${this.currentUser ? this.currentUser.name : 'Usuario'} inició operaciones en ${this.getCounterName(counter)}`);
        }
    }

    endOperations(counter) {
        if (confirm(`¿Estás seguro de que quieres finalizar operaciones en el contador ${this.getCounterName(counter)}?`)) {
            this.socket.emit('end_operations', {
                counter: counter
            });
            this.logOperation(`${this.currentUser ? this.currentUser.name : 'Usuario'} finalizó operaciones en ${this.getCounterName(counter)}`);
        }
    }

    refreshBalances() {
        this.socket.emit('request_balances_update');
        this.showNotification('Solicitando actualización de saldos...', 'info');
        this.updateBalances();
    }

    startGlobalOperations() {
        if (this.globalLock.isLocked && this.currentUser && this.globalLock.lockedBy !== this.currentUser.username) {
            this.showNotification(`El sistema está siendo usado por ${this.globalLock.lockedBy}`, 'error');
            return;
        }
        
        this.socket.emit('start_operations', { counter: 'global' });
        this.showNotification('Iniciando operaciones globales...', 'info');
    }

    endGlobalOperations() {
        if (!this.globalLock.isLocked || (this.currentUser && this.globalLock.lockedBy !== this.currentUser.username)) {
            this.showNotification('No tienes operaciones globales activas', 'error');
            return;
        }
        
        this.socket.emit('end_operations', { counter: 'global' });
        this.showNotification('Finalizando operaciones globales...', 'info');
    }

    updateLockStatus() {
        const counters = ['gallo', 'leon', 'perro', 'mano', 'estrella'];
        
        counters.forEach(counter => {
            const lockElement = document.getElementById(`lock-${counter}`);
            const isLocked = this.operationLocks[counter] !== null;
            
            if (isLocked) {
                const lockedBy = this.operationLocks[counter];
                const isLockedByMe = this.currentUser && lockedBy === this.currentUser.username;
                
                // Obtener nombre más descriptivo
                let displayName = 'Usuario desconocido';
                if (lockedBy) {
                    if (this.currentUser && lockedBy === this.currentUser.username) {
                        displayName = 'Tú';
                    } else if (lockedBy.startsWith('contador_')) {
                        const counterName = this.getCounterName(lockedBy.replace('contador_', ''));
                        displayName = `Contador ${counterName}`;
                    } else if (lockedBy === 'alan') {
                        displayName = 'Administrador';
                    } else {
                        displayName = lockedBy;
                    }
                }
                
                lockElement.innerHTML = `
                    <div class="lock-indicator ${isLockedByMe ? 'locked-by-me' : 'locked-by-other'}">
                        <i class="fas fa-lock"></i>
                        <span>${displayName}</span>
                    </div>
                `;
            } else {
                lockElement.innerHTML = `
                    <div class="lock-indicator unlocked">
                        <i class="fas fa-unlock"></i>
                        <span>Libre</span>
                    </div>
                `;
            }
        });
    }

    updateGlobalLockStatus() {
        // Actualizar indicador global de bloqueo
        const globalLockElement = document.getElementById('global-lock-status');
        if (globalLockElement) {
            if (this.globalLock.isLocked) {
                const isCurrentUser = this.currentUser && this.globalLock.lockedBy === this.currentUser.username;
                globalLockElement.innerHTML = `
                    <div class="global-lock-indicator ${isCurrentUser ? 'locked-by-me' : 'locked-by-other'}">
                        <i class="fas fa-globe"></i>
                        <span>Bloqueo Global: ${isCurrentUser ? 'Tú' : this.globalLock.lockedBy}</span>
                    </div>
                `;
            } else {
                globalLockElement.innerHTML = `
                    <div class="global-lock-indicator unlocked">
                        <i class="fas fa-globe"></i>
                        <span>Sistema Libre</span>
                    </div>
                `;
            }
        }
    }

    getOtherCounters(excludeCounter) {
        return ['gallo', 'leon', 'perro', 'mano', 'estrella'].filter(c => c !== excludeCounter);
    }

    getCounterName(counter) {
        const names = {
            bank: 'Banco Central',
            gallo: 'Gallo',
            leon: 'León',
            perro: 'Perro',
            mano: 'Mano',
            estrella: 'Estrella'
        };
        return names[counter];
    }

    getOperationText(operation) {
        const operationTexts = {
            add: 'sumó',
            subtract: 'restó',
            set: 'estableció',
            transfer: 'transfirió',
            deposit: 'depositó en banco',
            duplicate: 'duplicó',
            reduce: 'redujo',
            reset: 'reinició'
        };
        return operationTexts[operation] || operation;
    }

    addToOperationHistory(operationData) {
        // Agregar nueva operación al inicio del array
        this.operationHistory.unshift(operationData);
        
        // Mantener solo las últimas 10 operaciones
        if (this.operationHistory.length > 10) {
            this.operationHistory = this.operationHistory.slice(0, 10);
        }
        
        // Actualizar la visualización
        this.updateOperationHistoryDisplay();
    }

    updateOperationHistoryDisplay() {
        const historyContainer = document.getElementById('operationHistory');
        if (!historyContainer) return;
        
        if (this.operationHistory.length === 0) {
            historyContainer.innerHTML = '<p style="color: #7f8c8d; text-align: center; font-style: italic;">No hay operaciones recientes</p>';
            return;
        }
        
        const historyHTML = this.operationHistory.map((op, index) => `
            <div class="history-item ${index === 0 ? 'latest' : ''}">
                <div class="history-icon">${op.icon}</div>
                <div class="history-content">
                    <div class="history-message">${op.message}</div>
                    <div class="history-time">${op.time}</div>
                </div>
            </div>
        `).join('');
        
        historyContainer.innerHTML = historyHTML;
    }

    updateUserDisplay() {
        setTimeout(() => {
            const userDisplayElement = document.getElementById('userDisplayName');
            console.log('Actualizando display del usuario...');
            console.log('Elemento userDisplayName encontrado:', userDisplayElement);
            console.log('Usuario actual:', this.currentUser);
            
            if (userDisplayElement && this.currentUser) {
                if (this.currentUser.role === 'admin') {
                    userDisplayElement.textContent = 'Administrador del Sistema';
                    userDisplayElement.style.display = 'block';
                    userDisplayElement.style.visibility = 'visible';
                    console.log('Asignado texto para admin:', userDisplayElement.textContent);
                } else {
                    const counterName = this.getCounterName(this.currentUser.counter);
                    userDisplayElement.textContent = `Contador: ${counterName}`;
                    userDisplayElement.style.display = 'block';
                    userDisplayElement.style.visibility = 'visible';
                    console.log('Asignado texto para contador:', userDisplayElement.textContent);
                }
            } else {
                console.error('Elemento userDisplayName no encontrado o usuario no definido');
                console.log('Elemento:', userDisplayElement);
                console.log('Usuario:', this.currentUser);
            }
        }, 200);
    }

    updateBalances() {
        Object.keys(this.balances).forEach(counter => {
            const balanceElement = document.getElementById(`balance-${counter}`);
            if (balanceElement) {
                balanceElement.textContent = `$TDL ${this.balances[counter].toLocaleString()}`;
            }
        });
        this.updateHeaderBankBalance();
    }

    updateHeaderBankBalance() {
        const headerBankBalance = document.getElementById('header-bank-balance');
        if (headerBankBalance) {
            headerBankBalance.textContent = `$TDL ${this.balances.bank.toLocaleString()}`;
        }
    }

    resetAllBalances() {
        if (confirm('¿Estás seguro de que quieres reiniciar todos los saldos a $TDL 10,000?')) {
            this.logOperation(`${this.currentUser ? this.currentUser.name : 'Usuario'} reinició todos los saldos a $TDL 10,000`);
            this.socket.emit('update_balance', {
                operation: 'reset'
            });
            this.showNotification('Todos los saldos han sido reiniciados a $TDL 10,000', 'success');
        }
    }

    showAmountModal(title, counter, operation) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;
        
        if (operation === 'transfer_to_bank') {
            modalBody.innerHTML = `
                <div class="input-group">
                    <label>Porcentaje a transferir al banco (1-100%):</label>
                    <input type="number" id="customAmount" placeholder="Ingresa el porcentaje" min="1" max="100">
                    <small>Saldo actual: $${this.balances[counter].toLocaleString()}</small>
                </div>
                <button id="confirmAmountBtn" class="admin-btn">Transferir al Banco</button>
            `;
        } else if (operation === 'add_percentage_self') {
            modalBody.innerHTML = `
                <div class="input-group">
                    <label>Porcentaje a sumar del propio saldo (1-100%):</label>
                    <input type="number" id="customAmount" placeholder="Ingresa el porcentaje" min="1" max="100">
                    <small>Saldo actual: $${this.balances[counter].toLocaleString()}</small>
                </div>
                <button id="confirmAmountBtn" class="admin-btn">Sumar %</button>
            `;
        } else if (operation === 'subtract_percentage_self') {
            modalBody.innerHTML = `
                <div class="input-group">
                    <label>Porcentaje a restar del propio saldo (1-100%):</label>
                    <input type="number" id="customAmount" placeholder="Ingresa el porcentaje" min="1" max="100">
                    <small>Saldo actual: $${this.balances[counter].toLocaleString()}</small>
                </div>
                <button id="confirmAmountBtn" class="admin-btn">Restar %</button>
            `;
        } else {
            modalBody.innerHTML = `
            <div class="input-group">
                <label>Monto a ${operation === 'add' ? 'sumar' : 'restar'}:</label>
                <input type="number" id="customAmount" placeholder="Ingresa el monto" min="1">
            </div>
            <button id="confirmAmountBtn" class="admin-btn">Confirmar</button>
            `;
        }

        modal.style.display = 'block';

        document.getElementById('confirmAmountBtn').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('customAmount').value);
            if (amount && amount > 0) {
                if (operation === 'transfer_to_bank') {
                    // Calcular el monto basado en el porcentaje
                    const transferAmount = (this.balances[counter] * amount) / 100;
                    this.socket.emit('update_balance', {
                        counter: counter,
                        amount: transferAmount,
                        operation: 'deposit',
                        targetCounter: 'bank'
                    });
                } else if (operation === 'add_percentage_self') {
                    // Calcular el monto basado en el porcentaje del propio saldo
                    const addAmount = (this.balances[counter] * amount) / 100;
                    this.socket.emit('update_balance', {
                        counter: counter,
                        amount: addAmount,
                        operation: 'add'
                    });
                } else if (operation === 'subtract_percentage_self') {
                    // Calcular el monto basado en el porcentaje del propio saldo
                    const subtractAmount = (this.balances[counter] * amount) / 100;
                    this.socket.emit('update_balance', {
                        counter: counter,
                        amount: subtractAmount,
                        operation: 'subtract'
                    });
                } else {
                    this.handleAction(operation, counter, amount);
                }
                modal.style.display = 'none';
            } else {
                this.showNotification('Ingresa un monto válido', 'error');
            }
        });
    }

    showTransferModal(fromCounter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Transferir Porcentaje';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Porcentaje a transferir:</label>
                <input type="number" id="transferPercentage" placeholder="Ej: 25" min="1" max="100">
            </div>
            <div class="input-group">
                <label>Hacia qué contador:</label>
                <select id="transferTo">
                    <option value="">Seleccionar contador</option>
                    ${this.getOtherCounters(fromCounter).map(counter => 
                        `<option value="${counter}">${this.getCounterName(counter)}</option>`
                    ).join('')}
                </select>
            </div>
            <button id="confirmTransferBtn" class="admin-btn">Confirmar Transferencia</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmTransferBtn').addEventListener('click', () => {
            const percentage = parseInt(document.getElementById('transferPercentage').value);
            const toCounter = document.getElementById('transferTo').value;
            
            if (percentage && percentage > 0 && percentage <= 100 && toCounter) {
                const fromAmount = this.balances[fromCounter];
                const transferAmount = Math.floor(fromAmount * (percentage / 100));
                this.transferPercentage(fromCounter, toCounter, transferAmount);
                modal.style.display = 'none';
            } else {
                this.showNotification('Completa todos los campos correctamente', 'error');
            }
        });
    }

    transferPercentage(fromCounter, toCounter, amount) {
        if (this.balances[fromCounter] >= amount) {
            this.socket.emit('update_balance', {
                fromCounter: fromCounter,
                toCounter: toCounter,
                amount: amount,
                operation: 'transfer'
            });
                    this.showNotification(
                `Transferidos $TDL ${amount.toLocaleString()} de ${this.getCounterName(fromCounter)} a ${this.getCounterName(toCounter)}`, 
                        'success'
                    );
                } else {
                    this.showNotification('Saldo insuficiente para la transferencia', 'error');
                }
    }

    showAddPercentageModal(toCounter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Sumar Porcentaje de Otro Contador';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>De qué contador tomar el porcentaje:</label>
                <select id="addFromCounter">
                    <option value="">Seleccionar contador</option>
                    ${['gallo', 'leon', 'perro', 'mano', 'estrella'].map(counter => 
                        `<option value="${counter}">${this.getCounterName(counter)}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="input-group">
                <label>Porcentaje a sumar:</label>
                <input type="number" id="addPercentage" placeholder="Ej: 25" min="1" max="100">
            </div>
            <button id="confirmAddPercentageBtn" class="admin-btn">Confirmar</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmAddPercentageBtn').addEventListener('click', () => {
            const fromCounter = document.getElementById('addFromCounter').value;
            const percentage = parseInt(document.getElementById('addPercentage').value);
            
            if (fromCounter && percentage && percentage > 0 && percentage <= 100) {
                const fromAmount = this.balances[fromCounter];
                const addAmount = Math.floor(fromAmount * (percentage / 100));
                
                this.socket.emit('update_balance', {
                    counter: toCounter,
                    amount: this.balances[toCounter] + addAmount,
                    operation: 'set'
                });
                
                this.showNotification(
                    `Se sumaron $TDL ${addAmount.toLocaleString()} (${percentage}% de ${this.getCounterName(fromCounter)}) a ${this.getCounterName(toCounter)}`, 
                    'success'
                );
                modal.style.display = 'none';
            } else {
                this.showNotification('Completa todos los campos correctamente', 'error');
            }
        });
    }

    showSubtractPercentageModal(toCounter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Restar Porcentaje de Otro Contador';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>De qué contador tomar el porcentaje:</label>
                <select id="subtractFromCounter">
                    <option value="">Seleccionar contador</option>
                    ${['gallo', 'leon', 'perro', 'mano', 'estrella'].map(counter => 
                        `<option value="${counter}">${this.getCounterName(counter)}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="input-group">
                <label>Porcentaje a restar:</label>
                <input type="number" id="subtractPercentage" placeholder="Ej: 25" min="1" max="100">
            </div>
            <button id="confirmSubtractPercentageBtn" class="admin-btn">Confirmar</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmSubtractPercentageBtn').addEventListener('click', () => {
            const fromCounter = document.getElementById('subtractFromCounter').value;
            const percentage = parseInt(document.getElementById('subtractPercentage').value);
            
            if (fromCounter && percentage && percentage > 0 && percentage <= 100) {
                const fromAmount = this.balances[fromCounter];
                const subtractAmount = Math.floor(fromAmount * (percentage / 100));
                
                if (this.balances[toCounter] >= subtractAmount) {
                    this.socket.emit('update_balance', {
                        counter: toCounter,
                        amount: this.balances[toCounter] - subtractAmount,
                        operation: 'set'
                    });
                    
                    this.showNotification(
                        `Se restaron $TDL ${subtractAmount.toLocaleString()} (${percentage}% de ${this.getCounterName(fromCounter)}) de ${this.getCounterName(toCounter)}`, 
                        'success'
                    );
                    modal.style.display = 'none';
                } else {
                    this.showNotification('Saldo insuficiente para realizar la operación', 'error');
                }
            } else {
                this.showNotification('Completa todos los campos correctamente', 'error');
            }
        });
    }

    showDepositToBankModal(fromCounter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Depositar Porcentaje en el Banco';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Porcentaje a depositar en el banco:</label>
                <input type="number" id="depositPercentage" placeholder="Ej: 25" min="1" max="100">
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                <strong>Nota:</strong> Este dinero se transferirá al banco y será administrado por el administrador.
            </p>
            <button id="confirmDepositBtn" class="admin-btn">Confirmar Depósito</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmDepositBtn').addEventListener('click', () => {
            const percentage = parseInt(document.getElementById('depositPercentage').value);
            
            if (percentage && percentage > 0 && percentage <= 100) {
                const fromAmount = this.balances[fromCounter];
                const depositAmount = Math.floor(fromAmount * (percentage / 100));
                
                this.socket.emit('update_balance', {
                    counter: fromCounter,
                    amount: this.balances[fromCounter] - depositAmount,
                    operation: 'set'
                });
                
                this.socket.emit('update_balance', {
                    counter: 'bank',
                    amount: this.balances.bank + depositAmount,
                    operation: 'set'
                });
                
                this.showNotification(
                    `Se depositaron $TDL ${depositAmount.toLocaleString()} (${percentage}% de ${this.getCounterName(fromCounter)}) en el banco`, 
                    'success'
                );
                modal.style.display = 'none';
            } else {
                this.showNotification('Ingresa un porcentaje válido (1-100)', 'error');
            }
        });
    }

    duplicateBalance(counter) {
        this.socket.emit('update_balance', {
            counter: counter,
            amount: this.balances[counter] * 2,
            operation: 'set'
        });
        this.showNotification(`Saldo duplicado para ${this.getCounterName(counter)}`, 'success');
    }

    loseHalfBalance(counter) {
        const newAmount = Math.floor(this.balances[counter] / 2);
        this.socket.emit('update_balance', {
            counter: counter,
            amount: newAmount,
            operation: 'set'
        });
        this.showNotification(`Saldo reducido a la mitad para ${this.getCounterName(counter)}`, 'warning');
    }

    showSetBalanceModal(counter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `Establecer Saldo - ${this.getCounterName(counter)}`;
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Nuevo saldo para ${this.getCounterName(counter)}:</label>
                <input type="number" id="newBalance" placeholder="Ej: 25000" min="0" value="${this.balances[counter]}">
            </div>
            <button id="confirmSetBalanceBtn" class="admin-btn">Establecer Saldo</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmSetBalanceBtn').addEventListener('click', () => {
            const newBalance = parseInt(document.getElementById('newBalance').value);
            if (newBalance >= 0) {
                this.socket.emit('update_balance', {
                    counter: counter,
                    amount: newBalance,
                    operation: 'set'
                });
                this.showNotification(`Saldo de ${this.getCounterName(counter)} establecido en $TDL ${newBalance.toLocaleString()}`, 'success');
                modal.style.display = 'none';
            } else {
                this.showNotification('Ingresa un saldo válido (mayor o igual a 0)', 'error');
            }
        });
    }

    showAmountModal() {
        const modal = document.getElementById('amountModal');
        Object.keys(this.balances).forEach(counter => {
            document.getElementById(`amount-${counter}`).value = this.balances[counter];
        });
        modal.style.display = 'block';
    }

    applyAmounts() {
        const newBalances = {};
        let hasChanges = false;

        Object.keys(this.balances).forEach(counter => {
            const newAmount = parseInt(document.getElementById(`amount-${counter}`).value);
            if (newAmount !== this.balances[counter]) {
                newBalances[counter] = newAmount;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            // Enviar cada cambio individualmente
            Object.keys(newBalances).forEach(counter => {
                this.logOperation(`${this.currentUser ? this.currentUser.name : 'Usuario'} estableció el saldo de ${this.getCounterName(counter)} en $TDL ${newBalances[counter].toLocaleString()}`);
                this.socket.emit('update_balance', {
                    counter: counter,
                    amount: newBalances[counter],
                    operation: 'set'
                });
            });
            this.showNotification('Montos actualizados correctamente', 'success');
            document.getElementById('amountModal').style.display = 'none';
        } else {
            this.showNotification('No hay cambios para aplicar', 'warning');
        }
    }

    showSwapModal() {
        const modal = document.getElementById('swapModal');
        modal.style.display = 'block';
    }

    applySwap() {
        const fromCounter = document.getElementById('swapFrom').value;
        const toCounter = document.getElementById('swapTo').value;

        if (fromCounter === toCounter) {
            this.showNotification('No puedes intercambiar un contador consigo mismo', 'error');
            return;
        }

        this.socket.emit('update_balance', {
            fromCounter: fromCounter,
            toCounter: toCounter,
            operation: 'swap'
        });

        this.showNotification(
            `Saldos intercambiados entre ${this.getCounterName(fromCounter)} y ${this.getCounterName(toCounter)}`, 
            'success'
        );
        document.getElementById('swapModal').style.display = 'none';
    }

    showNotification(message, type = 'success') {
        // Remover notificación existente
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Función para registrar operaciones
    logOperation(description, user = null) {
        const operation = {
            timestamp: new Date(),
            description: description,
            user: user || (this.currentUser ? this.currentUser.name : 'Sistema')
        };
        
        this.operations.unshift(operation); // Agregar al inicio
        if (this.operations.length > 50) { // Mantener solo las últimas 50
            this.operations = this.operations.slice(0, 50);
        }
        
        this.saveOperations();
    }

    // Función para actualizar el dashboard
    updateDashboard() {
        this.updateDashboardBalances();
        this.updateDashboardOperations();
    }

    updateDashboardBalances() {
        const balancesContainer = document.getElementById('dashboardBalances');
        const counters = [
            { key: 'bank', name: 'Banco Central', icon: '🏦' },
            { key: 'gallo', name: 'Gallo', icon: '🐦' },
            { key: 'leon', name: 'León', icon: '👑' },
            { key: 'perro', name: 'Perro', icon: '🐕' },
            { key: 'mano', name: 'Mano', icon: '✋' },
            { key: 'estrella', name: 'Estrella', icon: '⭐' }
        ];

        balancesContainer.innerHTML = counters.map(counter => `
            <div class="balance-card">
                <h3>${counter.icon} ${counter.name}</h3>
                <div class="amount">$TDL ${this.balances[counter.key].toLocaleString()}</div>
            </div>
        `).join('');
    }

    updateDashboardOperations() {
        const operationsContainer = document.getElementById('operationsList');
        const lastOperations = this.operations.slice(0, 10); // Últimas 10 operaciones

        if (lastOperations.length === 0) {
            operationsContainer.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7);">No hay operaciones registradas</p>';
            return;
        }

        operationsContainer.innerHTML = lastOperations.map(operation => `
            <div class="operation-item">
                <div class="operation-time">${operation.timestamp.toLocaleString()}</div>
                <div class="operation-description">${operation.description}</div>
                <div class="operation-user">👤 ${operation.user}</div>
            </div>
        `).join('');
    }

    // Función para guardar operaciones
    saveOperations() {
        localStorage.setItem('audacity_operations', JSON.stringify(this.operations));
    }

    // Función para cargar operaciones
    loadOperations() {
        const saved = localStorage.getItem('audacity_operations');
        if (saved) {
            this.operations = JSON.parse(saved).map(op => ({
                ...op,
                timestamp: new Date(op.timestamp)
            }));
        }
    }

    // Función para mostrar el dashboard
    showDashboard() {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        this.updateDashboard();
    }

    // Función para volver al juego
    showGameScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        this.updateBalances();
        this.updateLockStatus();
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AudacityGame();
});

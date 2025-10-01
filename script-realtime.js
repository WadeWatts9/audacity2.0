// Sistema de autenticación y gestión del juego AUDACITY con WebSockets

class AudacityGameRealtime {
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
        this.operations = []; // Array para almacenar las operaciones
        
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
            console.log('📊 Saldos anteriores:', this.balances);
            this.balances = balances;
            console.log('📊 Saldos actualizados en cliente:', this.balances);
            this.updateBalances();
            console.log('✅ Interfaz actualizada');
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
            this.showNotification(`${data.user} realizó ${data.operation} en ${data.counter} por $${data.amount}`, 'success');
        });

        // Escuchar notificaciones de operaciones terminadas
        this.socket.on('operation_finished', (data) => {
            this.showNotification(`${data.user} terminó operación en ${this.getCounterName(data.counter)}`, 'info');
        });

        // Escuchar notificaciones de actualización de saldos
        this.socket.on('balances_refreshed', (data) => {
            this.showNotification(`Saldos actualizados por ${data.user}`, 'success');
        });

        // Función de debug para verificar sincronización
        this.socket.on('debug_sync', (data) => {
            console.log('🔍 Debug de sincronización:', data);
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

        // Botones del panel de banco del admin
        document.getElementById('adminSetBankBalanceBtn').addEventListener('click', () => {
            this.showSetBankBalanceModal();
        });

        document.getElementById('adminRedistributeEquallyBtn').addEventListener('click', () => {
            this.redistributeEqually();
        });

        document.getElementById('adminRedistributeCustomBtn').addEventListener('click', () => {
            this.showBankRedistributionModal();
        });

        document.getElementById('adminTransferToCounterBtn').addEventListener('click', () => {
            this.showTransferFromBankModal();
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
            
            this.logOperation(`Usuario ${this.currentUser.name} inició sesión`);
            this.showGameScreen();
            this.setupUserInterface();
            this.showNotification(`Bienvenido, ${this.currentUser.name}`, 'success');
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
        document.getElementById('currentUser').textContent = this.currentUser.name;
        document.getElementById('currentUserRole').textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Contador';
        this.updateHeaderBankBalance();
        this.setupUserInterface();
    }

    setupUserInterface() {
        // Mostrar/ocultar panel de administración
        const adminPanel = document.getElementById('adminPanel');
        const bankInfo = document.getElementById('bank-info');
        
        if (this.currentUser.role === 'admin') {
            adminPanel.style.display = 'block';
            bankInfo.classList.add('admin-clickable');
        } else {
            adminPanel.style.display = 'none';
            bankInfo.classList.remove('admin-clickable');
        }

        // Configurar acciones para cada contador
        this.setupCounterActions();
    }

    setupCounterActions() {
        // Solo contadores normales, el banco está en el header
        const counters = ['gallo', 'leon', 'perro', 'mano', 'estrella'];
        
        counters.forEach(counter => {
            const actionsDiv = document.getElementById(`actions-${counter}`);
            actionsDiv.innerHTML = '';

            if (this.currentUser.role === 'admin' || this.currentUser.counter === counter) {
                // Botones para contadores normales
                this.createActionButton(actionsDiv, '💰 Sumar Monto', 'custom_add', counter);
                this.createActionButton(actionsDiv, '💸 Restar Monto', 'custom_subtract', counter);
                this.createActionButton(actionsDiv, '🔄 Transferir %', 'custom_transfer', counter);
                this.createActionButton(actionsDiv, '📈 Sumar % de Otro', 'custom_add_percentage', counter);
                this.createActionButton(actionsDiv, '📉 Restar % de Otro', 'custom_subtract_percentage', counter);
                this.createActionButton(actionsDiv, '🏦 Depositar % en Banco', 'deposit_to_bank', counter);
                this.createActionButton(actionsDiv, '⚡ Duplicar Saldo', 'duplicate', counter);
                this.createActionButton(actionsDiv, '⚠️ Perder Mitad', 'lose_half', counter);
                
                // Botones adicionales solo para admin
                if (this.currentUser.role === 'admin') {
                    this.createActionButton(actionsDiv, '🎯 Establecer Saldo', 'set_balance', counter);
                }
                
                // Botones de control de operación
                this.createActionButton(actionsDiv, '✅ Terminar Operación', 'finish_operation', counter);
                this.createActionButton(actionsDiv, '🔄 Actualizar Cuentas', 'refresh_balances', counter);
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

    // Helper para limpiar event listeners
    clearEventListeners(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    }

    handleAction(action, counter, value) {
        if (action === 'custom_add') {
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
        } else if (action === 'redistribute_equally') {
            this.redistributeEqually();
        } else if (action === 'redistribute_custom') {
            this.showCustomRedistribution();
        } else if (action === 'transfer_to_counter') {
            this.showTransferFromBankModal();
        } else if (action === 'duplicate') {
            this.socket.emit('update_balance', {
                counter: counter,
                amount: this.balances[counter],
                operation: 'set'
            });
            this.showNotification(`Saldo duplicado para ${this.getCounterName(counter)}`, 'success');
        } else if (action === 'lose_half') {
            const newAmount = Math.floor(this.balances[counter] / 2);
            this.socket.emit('update_balance', {
                counter: counter,
                amount: newAmount,
                operation: 'set'
            });
            this.showNotification(`Saldo reducido a la mitad para ${this.getCounterName(counter)}`, 'warning');
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
        } else if (action === 'percentage') {
            this.showPercentageModal(counter, value);
        } else if (action === 'finish_operation') {
            this.finishOperation(counter);
        } else if (action === 'refresh_balances') {
            this.refreshBalances();
        }
    }

    showPercentageModal(fromCounter, percentage) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `Transferir ${percentage}% del saldo`;
        
        const fromAmount = this.balances[fromCounter];
        const transferAmount = Math.floor(fromAmount * (percentage / 100));
        
        modalBody.innerHTML = `
            <p>Transferir <strong>$TDL ${transferAmount.toLocaleString()}</strong> desde <strong>${this.getCounterName(fromCounter)}</strong></p>
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
            const toCounter = document.getElementById('transferTo').value;
            if (toCounter) {
                this.transferPercentage(fromCounter, toCounter, transferAmount);
                modal.style.display = 'none';
            } else {
                this.showNotification('Selecciona un contador de destino', 'error');
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
            this.logOperation(`${this.currentUser.name} reinició todos los saldos a $TDL 10,000`);
            this.socket.emit('update_balance', {
                operation: 'reset'
            });
            this.showNotification('Todos los saldos han sido reiniciados a $TDL 10,000', 'success');
        }
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
                this.logOperation(`${this.currentUser.name} estableció el saldo de ${this.getCounterName(counter)} en $TDL ${newBalances[counter].toLocaleString()}`);
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

    showAmountModal(title, counter, operation) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = title;
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Monto a ${operation === 'add' ? 'sumar' : 'restar'}:</label>
                <input type="number" id="customAmount" placeholder="Ingresa el monto" min="1">
            </div>
            <button id="confirmAmountBtn" class="admin-btn">Confirmar</button>
        `;

        modal.style.display = 'block';

        // Limpiar event listeners anteriores
        this.clearEventListeners('confirmAmountBtn');

        document.getElementById('confirmAmountBtn').addEventListener('click', () => {
            const amount = parseInt(document.getElementById('customAmount').value);
            if (amount && amount > 0) {
                this.handleAction(operation, counter, amount);
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

    showTransferFromBankModal() {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Transferir desde el Banco';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Hacia qué contador:</label>
                <select id="transferToFromBank">
                    <option value="">Seleccionar contador</option>
                    <option value="gallo">Gallo</option>
                    <option value="leon">León</option>
                    <option value="perro">Perro</option>
                    <option value="mano">Mano</option>
                    <option value="estrella">Estrella</option>
                </select>
            </div>
            <div class="input-group">
                <label>Monto a transferir:</label>
                <input type="number" id="transferAmountFromBank" placeholder="Ingresa el monto" min="1" max="${this.balances.bank}">
            </div>
            <button id="confirmTransferFromBankBtn" class="admin-btn">Confirmar Transferencia</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmTransferFromBankBtn').addEventListener('click', () => {
            const toCounter = document.getElementById('transferToFromBank').value;
            const amount = parseInt(document.getElementById('transferAmountFromBank').value);
            
            if (toCounter && amount && amount > 0 && amount <= this.balances.bank) {
                this.socket.emit('update_balance', {
                    counter: 'bank',
                    amount: this.balances.bank - amount,
                    operation: 'set'
                });
                
                this.socket.emit('update_balance', {
                    counter: toCounter,
                    amount: this.balances[toCounter] + amount,
                    operation: 'set'
                });
                
                this.showNotification(
                    `Se transfirieron $TDL ${amount.toLocaleString()} del banco a ${this.getCounterName(toCounter)}`, 
                    'success'
                );
                modal.style.display = 'none';
            } else {
                this.showNotification('Completa todos los campos correctamente', 'error');
            }
        });
    }

    redistributeEqually() {
        if (this.balances.bank <= 0) {
            this.showNotification('No hay saldo en el banco para redistribuir', 'warning');
            return;
        }

        const counters = ['gallo', 'leon', 'perro', 'mano', 'estrella'];
        const amountPerCounter = Math.floor(this.balances.bank / counters.length);
        const remaining = this.balances.bank % counters.length;

        counters.forEach(counter => {
            this.socket.emit('update_balance', {
                counter: counter,
                amount: this.balances[counter] + amountPerCounter,
                operation: 'set'
            });
        });

        // Dar el resto al primer contador
        if (remaining > 0) {
            this.socket.emit('update_balance', {
                counter: counters[0],
                amount: this.balances[counters[0]] + remaining,
                operation: 'set'
            });
        }

        this.socket.emit('update_balance', {
            counter: 'bank',
            amount: 0,
            operation: 'set'
        });

        this.showNotification(`Se redistribuyó equitativamente el saldo del banco entre todos los contadores`, 'success');
    }

    showCustomRedistribution() {
        // Esta función se implementaría de manera similar a la versión simple
        this.showNotification('Redistribución personalizada - función en desarrollo', 'info');
    }

    showSetBankBalanceModal() {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Establecer Saldo del Banco Central';
        modalBody.innerHTML = `
            <div class="input-group">
                <label>Nuevo saldo del banco:</label>
                <input type="number" id="newBankBalance" placeholder="Ej: 50000" min="0" value="${this.balances.bank}">
            </div>
            <button id="confirmSetBankBalanceBtn" class="admin-btn">Establecer Saldo</button>
        `;

        modal.style.display = 'block';

        document.getElementById('confirmSetBankBalanceBtn').addEventListener('click', () => {
            const newBalance = parseInt(document.getElementById('newBankBalance').value);
            if (newBalance >= 0) {
                this.socket.emit('update_balance', {
                    counter: 'bank',
                    amount: newBalance,
                    operation: 'set'
                });
                this.showNotification(`Saldo del banco establecido en $TDL ${newBalance.toLocaleString()}`, 'success');
                modal.style.display = 'none';
            } else {
                this.showNotification('Ingresa un saldo válido (mayor o igual a 0)', 'error');
            }
        });
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
    }

    // Función para terminar operación
    finishOperation(counter) {
        if (confirm(`¿Estás seguro de que quieres terminar la operación en el contador ${this.getCounterName(counter)}?`)) {
            // Notificar al servidor que se terminó la operación
            this.socket.emit('finish_operation', {
                counter: counter,
                user: this.currentUser.name
            });
            
            this.logOperation(`${this.currentUser.name} terminó la operación en ${this.getCounterName(counter)}`);
            this.showNotification(`Operación terminada en ${this.getCounterName(counter)}`, 'success');
        }
    }

    // Función para actualizar cuentas
    refreshBalances() {
        // Solicitar actualización de saldos al servidor
        this.socket.emit('request_balances_update');
        this.showNotification('Solicitando actualización de saldos...', 'info');
        
        // También actualizar la interfaz local
        this.updateBalances();
    }
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.game = new AudacityGameRealtime();
});

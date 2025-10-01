// Sistema de contadores AUDACITY simplificado
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

        // Escuchar respuestas de autenticación
        this.socket.on('auth_success', (userData) => {
            this.currentUser = userData;
            this.showGameScreen();
            this.setupUserInterface();
            this.showNotification(`Bienvenido, ${userData.name}`, 'success');
        });

        this.socket.on('auth_error', (data) => {
            this.showNotification(data.message, 'error');
        });

        // Escuchar respuestas de operaciones
        this.socket.on('operation_success', (data) => {
            this.showNotification(data.message, 'success');
        });

        this.socket.on('error', (data) => {
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

        // Admin actions
        document.getElementById('resetAllBtn').addEventListener('click', () => {
            this.resetAllBalances();
        });

        document.getElementById('setAmountBtn').addEventListener('click', () => {
            this.showSetAmountModal();
        });

        document.getElementById('setBankBtn').addEventListener('click', () => {
            this.showSetBankModal();
        });

        document.getElementById('divideBankBtn').addEventListener('click', () => {
            this.showDivideBankModal();
        });

        // Modal close
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        if (this.socket && this.socket.connected) {
            this.socket.emit('authenticate', { username, password });
        } else {
            errorDiv.textContent = 'No hay conexión con el servidor';
            errorDiv.style.display = 'block';
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.socket.disconnect();
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('gameScreen').style.display = 'none';
        this.socket.connect();
    }

    showGameScreen() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
    }

    setupUserInterface() {
        // Mostrar información del usuario
        document.getElementById('userDisplayName').textContent = this.currentUser.name;
        document.getElementById('currentUserRole').textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Contador';
        
        // Mostrar panel de administración si es admin
        if (this.currentUser.role === 'admin') {
            document.getElementById('adminPanel').style.display = 'block';
        }

        // Configurar acciones para cada contador
        const counters = ['gallo', 'leon', 'perro', 'mano', 'estrella'];
        counters.forEach(counter => {
            this.setupCounterActions(counter);
        });
    }

    setupCounterActions(counter) {
        const actionsDiv = document.getElementById(`actions-${counter}`);
        actionsDiv.innerHTML = '';

        // Verificar si el usuario puede operar en este contador
        const canOperate = this.currentUser.role === 'admin' || 
                          (this.currentUser.role === 'counter' && this.currentUser.counter === counter);

        if (canOperate) {
            // Botones básicos
            this.createActionButton(actionsDiv, '➕ Sumar Monto', 'add', counter);
            this.createActionButton(actionsDiv, '➖ Restar Monto', 'subtract', counter);
            this.createActionButton(actionsDiv, '🎯 Establecer', 'set', counter);
            
            // Botones de porcentaje
            this.createActionButton(actionsDiv, '📈 Sumar % de mi saldo', 'add_percentage', counter);
            this.createActionButton(actionsDiv, '📉 Restar % de mi saldo', 'subtract_percentage', counter);
            
            // Botones de transferencia
            this.createActionButton(actionsDiv, '🔄 Transferir % a otra cuenta', 'transfer', counter);
            this.createActionButton(actionsDiv, '🏦 Transferir % al banco', 'transfer_to_bank', counter);

            // Botones de duplicar y dividir saldo
            this.createActionButton(actionsDiv, '🔄 Duplicar saldo', 'duplicate', counter);
            this.createActionButton(actionsDiv, '✂️ Dividir saldo', 'divide', counter);

            // Botones adicionales para admin
            if (this.currentUser.role === 'admin') {
                this.createActionButton(actionsDiv, '✂️ Reducir a la mitad', 'halve', counter);
            }
        } else {
            // Si no puede operar, mostrar mensaje
            const message = document.createElement('div');
            message.textContent = 'Solo puedes operar en tu contador';
            message.style.cssText = 'color: #e74c3c; font-size: 12px; text-align: center; margin: 10px 0;';
            actionsDiv.appendChild(message);
        }
    }

    createActionButton(container, text, action, counter) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'action-btn';
        button.addEventListener('click', () => {
            this.showOperationModal(action, counter);
        });
        container.appendChild(button);
    }

    showOperationModal(action, counter) {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = `${action.toUpperCase()} - ${this.getCounterName(counter)}`;
        
        let html = '';
        switch (action) {
            case 'add':
            case 'subtract':
            case 'set':
                html = `
                    <div class="form-group">
                        <label for="amount">Monto:</label>
                        <input type="number" id="amount" min="0" step="0.01" required>
                    </div>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Ejecutar</button>
                `;
                break;
            case 'add_percentage':
            case 'subtract_percentage':
                html = `
                    <div class="form-group">
                        <label for="percentage">Porcentaje (1-100):</label>
                        <input type="number" id="percentage" min="1" max="100" required>
                    </div>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Ejecutar</button>
                `;
                break;
            case 'transfer':
                html = `
                    <div class="form-group">
                        <label for="percentage">Porcentaje a transferir (1-100):</label>
                        <input type="number" id="percentage" min="1" max="100" required>
                    </div>
                    <div class="form-group">
                        <label for="targetCounter">Transferir a:</label>
                        <select id="targetCounter" required>
                            <option value="">Seleccionar cuenta</option>
                            <option value="gallo">Gallo</option>
                            <option value="leon">León</option>
                            <option value="perro">Perro</option>
                            <option value="mano">Mano</option>
                            <option value="estrella">Estrella</option>
                        </select>
                    </div>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Ejecutar</button>
                `;
                break;
            case 'transfer_to_bank':
                html = `
                    <div class="form-group">
                        <label for="percentage">Porcentaje a transferir al banco (1-100):</label>
                        <input type="number" id="percentage" min="1" max="100" required>
                    </div>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Ejecutar</button>
                `;
                break;
            case 'duplicate':
            case 'halve':
                html = `
                    <p>¿Estás seguro de que quieres ${action === 'duplicate' ? 'duplicar' : 'reducir a la mitad'} el saldo de ${this.getCounterName(counter)}?</p>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Confirmar</button>
                `;
                break;
            case 'divide':
                html = `
                    <div class="form-group">
                        <label for="divideBy">Dividir saldo entre:</label>
                        <input type="number" id="divideBy" min="2" max="100" value="2" required>
                        <small>El saldo actual se dividirá entre este número</small>
                    </div>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Dividir Saldo</button>
                `;
                break;
        }

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    performOperation(action, counter) {
        let amount = 0;
        let percentage = 0;
        let targetCounter = '';
        let divideBy = 0;
        
        if (action === 'add' || action === 'subtract' || action === 'set') {
            amount = parseFloat(document.getElementById('amount').value);
            if (isNaN(amount) || amount < 0) {
                this.showNotification('Monto inválido', 'error');
                return;
            }
        } else if (action === 'add_percentage' || action === 'subtract_percentage' || action === 'transfer_to_bank') {
            percentage = parseFloat(document.getElementById('percentage').value);
            if (isNaN(percentage) || percentage < 1 || percentage > 100) {
                this.showNotification('Porcentaje inválido (debe ser entre 1 y 100)', 'error');
                return;
            }
        } else if (action === 'transfer') {
            percentage = parseFloat(document.getElementById('percentage').value);
            targetCounter = document.getElementById('targetCounter').value;
            if (isNaN(percentage) || percentage < 1 || percentage > 100) {
                this.showNotification('Porcentaje inválido (debe ser entre 1 y 100)', 'error');
                return;
            }
            if (!targetCounter) {
                this.showNotification('Debe seleccionar una cuenta destino', 'error');
                return;
            }
        } else if (action === 'divide') {
            divideBy = parseFloat(document.getElementById('divideBy').value);
            if (isNaN(divideBy) || divideBy < 2 || divideBy > 100) {
                this.showNotification('Número inválido (debe ser entre 2 y 100)', 'error');
                return;
            }
        }

        // Enviar operación al servidor
        const operationData = {
            operation: action,
            counter: counter,
            amount: amount,
            percentage: percentage,
            targetCounter: targetCounter,
            divideBy: divideBy
        };

        this.socket.emit('operation', operationData);

        // Cerrar modal
        document.getElementById('operationModal').style.display = 'none';
    }

    resetAllBalances() {
        if (confirm('¿Estás seguro de que quieres reiniciar todos los saldos a $TDL 10,000?')) {
            this.socket.emit('operation', {
                operation: 'reset_all',
                counter: 'all'
            });
        }
    }

    showSetAmountModal() {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'ESTABLECER MONTOS ESPECÍFICOS';
        
        const html = `
            <div class="form-group">
                <label for="bankAmount">Banco Central:</label>
                <input type="number" id="bankAmount" min="0" step="0.01" value="${this.balances.bank}">
            </div>
            <div class="form-group">
                <label for="galloAmount">Gallo:</label>
                <input type="number" id="galloAmount" min="0" step="0.01" value="${this.balances.gallo}">
            </div>
            <div class="form-group">
                <label for="leonAmount">León:</label>
                <input type="number" id="leonAmount" min="0" step="0.01" value="${this.balances.leon}">
            </div>
            <div class="form-group">
                <label for="perroAmount">Perro:</label>
                <input type="number" id="perroAmount" min="0" step="0.01" value="${this.balances.perro}">
            </div>
            <div class="form-group">
                <label for="manoAmount">Mano:</label>
                <input type="number" id="manoAmount" min="0" step="0.01" value="${this.balances.mano}">
            </div>
            <div class="form-group">
                <label for="estrellaAmount">Estrella:</label>
                <input type="number" id="estrellaAmount" min="0" step="0.01" value="${this.balances.estrella}">
            </div>
            <button onclick="game.setSpecificAmounts()" class="btn-primary">Establecer Montos</button>
        `;

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    showSetBankModal() {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'ESTABLECER SALDO DEL BANCO';
        
        const html = `
            <div class="form-group">
                <label>Saldo actual del banco: $TDL ${this.balances.bank.toLocaleString()}</label>
            </div>
            <div class="form-group">
                <label for="newBankAmount">Nuevo saldo del banco:</label>
                <input type="number" id="newBankAmount" min="0" step="0.01" value="${this.balances.bank}" required>
            </div>
            <button onclick="game.setBankAmount()" class="btn-primary">Establecer Saldo del Banco</button>
        `;

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    setSpecificAmounts() {
        const amounts = {
            bank: parseFloat(document.getElementById('bankAmount').value) || 0,
            gallo: parseFloat(document.getElementById('galloAmount').value) || 0,
            leon: parseFloat(document.getElementById('leonAmount').value) || 0,
            perro: parseFloat(document.getElementById('perroAmount').value) || 0,
            mano: parseFloat(document.getElementById('manoAmount').value) || 0,
            estrella: parseFloat(document.getElementById('estrellaAmount').value) || 0
        };

        this.socket.emit('operation', {
            operation: 'set_specific_amounts',
            amounts: amounts
        });

        document.getElementById('operationModal').style.display = 'none';
    }

    setBankAmount() {
        const newBankAmount = parseFloat(document.getElementById('newBankAmount').value);
        
        if (isNaN(newBankAmount) || newBankAmount < 0) {
            this.showNotification('Monto inválido', 'error');
            return;
        }

        this.socket.emit('operation', {
            operation: 'set_bank_amount',
            amount: newBankAmount
        });

        document.getElementById('operationModal').style.display = 'none';
    }

    showDivideBankModal() {
        const modal = document.getElementById('operationModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'DIVIDIR SALDO DEL BANCO';
        
        const html = `
            <div class="form-group">
                <label>Saldo actual del banco: $TDL ${this.balances.bank.toLocaleString()}</label>
            </div>
            <div class="form-group">
                <label for="divideType">Tipo de división:</label>
                <select id="divideType" onchange="game.toggleDivideOptions()">
                    <option value="equal">Dividir en partes iguales</option>
                    <option value="custom">Dividir monto específico</option>
                </select>
            </div>
            <div id="customAmountDiv" class="form-group" style="display: none;">
                <label for="customAmount">Monto a dividir:</label>
                <input type="number" id="customAmount" min="0" step="0.01" max="${this.balances.bank}">
            </div>
            <button onclick="game.divideBank()" class="btn-primary">Dividir</button>
        `;

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    toggleDivideOptions() {
        const divideType = document.getElementById('divideType').value;
        const customAmountDiv = document.getElementById('customAmountDiv');
        
        if (divideType === 'custom') {
            customAmountDiv.style.display = 'block';
        } else {
            customAmountDiv.style.display = 'none';
        }
    }

    divideBank() {
        const divideType = document.getElementById('divideType').value;
        let amount = 0;

        if (divideType === 'equal') {
            amount = this.balances.bank;
        } else {
            amount = parseFloat(document.getElementById('customAmount').value);
            if (isNaN(amount) || amount < 0 || amount > this.balances.bank) {
                this.showNotification('Monto inválido', 'error');
                return;
            }
        }

        this.socket.emit('operation', {
            operation: 'divide_bank',
            amount: amount
        });

        document.getElementById('operationModal').style.display = 'none';
    }

    updateBalances() {
        // Actualizar saldos en la interfaz
        Object.keys(this.balances).forEach(counter => {
            const balanceElement = document.getElementById(`balance-${counter}`);
            if (balanceElement) {
                balanceElement.textContent = `$TDL ${this.balances[counter].toLocaleString()}`;
            }
        });

        // Actualizar saldo del banco en el header
        const bankBalanceElement = document.getElementById('header-bank-balance');
        if (bankBalanceElement) {
            bankBalanceElement.textContent = `$TDL ${this.balances.bank.toLocaleString()}`;
        }
    }

    getCounterName(counter) {
        const names = {
            'gallo': 'Gallo',
            'leon': 'León',
            'perro': 'Perro',
            'mano': 'Mano',
            'estrella': 'Estrella'
        };
        return names[counter] || counter;
    }

    showNotification(message, type) {
        // Crear notificación simple
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        `;
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Inicializar el juego cuando se carga la página
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new AudacityGame();
});

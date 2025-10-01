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

        // Botones básicos para todos los usuarios
        this.createActionButton(actionsDiv, '➕ Sumar', 'add', counter);
        this.createActionButton(actionsDiv, '➖ Restar', 'subtract', counter);
        this.createActionButton(actionsDiv, '🎯 Establecer', 'set', counter);

        // Botones adicionales para admin
        if (this.currentUser.role === 'admin') {
            this.createActionButton(actionsDiv, '🔄 Duplicar', 'duplicate', counter);
            this.createActionButton(actionsDiv, '✂️ Reducir a la mitad', 'halve', counter);
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
            case 'duplicate':
            case 'halve':
                html = `
                    <p>¿Estás seguro de que quieres ${action === 'duplicate' ? 'duplicar' : 'reducir a la mitad'} el saldo de ${this.getCounterName(counter)}?</p>
                    <button onclick="game.performOperation('${action}', '${counter}')" class="btn-primary">Confirmar</button>
                `;
                break;
        }

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    }

    performOperation(action, counter) {
        let amount = 0;
        
        if (action === 'add' || action === 'subtract' || action === 'set') {
            amount = parseFloat(document.getElementById('amount').value);
            if (isNaN(amount) || amount < 0) {
                this.showNotification('Monto inválido', 'error');
                return;
            }
        }

        // Enviar operación al servidor
        this.socket.emit('operation', {
            operation: action,
            counter: counter,
            amount: amount
        });

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

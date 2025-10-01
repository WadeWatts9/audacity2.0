# 🚀 AUDACITY - Sistema de Contadores (Versión Simplificada)

Sistema de contadores en tiempo real con base de datos SQLite, optimizado para VPS.

## ✨ Características

- ✅ **Base de datos SQLite** - Persistencia de datos
- ✅ **WebSockets** - Tiempo real
- ✅ **Interfaz simplificada** - Fácil de usar
- ✅ **Sin bloqueos complejos** - Funciona siempre
- ✅ **Optimizado para VPS** - Ligero y rápido

## 🚀 Instalación Rápida en VPS

### **Opción 1: Script Automático (Recomendado)**
```bash
# Subir archivos al VPS
scp -r . root@TU_IP_DEL_VPS:/var/www/audacity/

# Conectar al VPS
ssh root@TU_IP_DEL_VPS

# Ejecutar instalación automática
cd /var/www/audacity
chmod +x install.sh
./install.sh
```

### **Opción 2: Instalación Manual**
```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias
sudo apt install -y build-essential python3-dev sqlite3 curl wget git nano htop

# 3. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Instalar PM2
sudo npm install -g pm2

# 5. Instalar Nginx
sudo apt install -y nginx

# 6. Instalar dependencias del proyecto
npm install --production

# 7. Configurar Nginx
sudo nano /etc/nginx/sites-available/audacity
```

**Contenido del archivo de configuración de Nginx:**
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 8. Activar sitio
sudo ln -s /etc/nginx/sites-available/audacity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 9. Iniciar aplicación
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔑 Credenciales de Acceso

### **Administrador**
- **Usuario**: `alan`
- **Contraseña**: `20243`

### **Contadores**
- **Gallo**: `contador_gallo` / `galloazul`
- **León**: `contador_leon` / `reyleon`
- **Perro**: `contador_perro` / `dalmata`
- **Mano**: `contador_mano` / `guante`
- **Estrella**: `contador_estrella` / `brillante`

## 🎯 Cómo Usar

### **Para Contadores:**
1. **Inicia sesión** con tus credenciales
2. **Selecciona tu contador** (Gallo, León, Perro, Mano, Estrella)
3. **Realiza operaciones**:
   - ➕ **Sumar**: Agregar monto al saldo
   - ➖ **Restar**: Quitar monto del saldo
   - 🎯 **Establecer**: Fijar un saldo específico

### **Para Administradores:**
- **Todas las operaciones** de los contadores
- **Reiniciar saldos** a valores iniciales
- **Establecer montos** específicos

## 🔧 Funcionalidades

### **Operaciones Básicas**
- **Sumar/Restar Monto**: Operaciones básicas
- **Establecer Saldo**: Fijar un monto específico
- **Duplicar/Reducir**: Operaciones especiales (solo admin)

### **Panel de Administración**
- **Reiniciar Saldos**: Volver a valores iniciales
- **Establecer Montos**: Configurar saldos específicos

## 🛠️ Tecnologías

- **Backend**: Node.js + Express + Socket.IO
- **Base de Datos**: SQLite3
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Comunicación**: WebSockets para tiempo real
- **Servidor**: Nginx + PM2

## 📁 Archivos Principales

```
audacity2.0/
├── server-simple.js      # Servidor simplificado
├── index-simple.html     # Interfaz simplificada
├── script-simple.js      # JavaScript simplificado
├── styles.css            # Estilos (mismo archivo)
├── ecosystem.config.js   # Configuración PM2
├── install.sh            # Script de instalación
└── package.json          # Dependencias
```

## 🔧 Comandos de Gestión

### **Ver estado de la aplicación:**
```bash
pm2 status
```

### **Ver logs:**
```bash
pm2 logs audacity-app
```

### **Reiniciar aplicación:**
```bash
pm2 restart audacity-app
```

### **Parar aplicación:**
```bash
pm2 stop audacity-app
```

### **Iniciar aplicación:**
```bash
pm2 start audacity-app
```

## 🗄️ Gestión de Base de Datos

### **Ver saldos:**
```bash
cd /var/www/audacity
sqlite3 audacity.db "SELECT * FROM balances;"
```

### **Ver operaciones:**
```bash
sqlite3 audacity.db "SELECT * FROM operations ORDER BY created_at DESC LIMIT 10;"
```

### **Backup de la base de datos:**
```bash
cp audacity.db audacity_backup_$(date +%Y%m%d_%H%M%S).db
```

## 🌐 Acceso

- **URL**: `http://TU_IP_DEL_VPS`
- **Puerto**: 80 (HTTP)
- **Base de datos**: SQLite (archivo local)

## 🚨 Solución de Problemas

### **La aplicación no inicia:**
```bash
pm2 logs audacity-app
sudo systemctl status nginx
```

### **No se actualizan los saldos:**
```bash
# Verificar base de datos
sqlite3 audacity.db "SELECT * FROM balances;"

# Reiniciar aplicación
pm2 restart audacity-app
```

### **Error de permisos:**
```bash
sudo chown -R root:root /var/www/audacity
sudo chmod -R 755 /var/www/audacity
```

## 📞 Soporte

Desarrollado por **Alan Canto**
- LinkedIn: [Alan Canto](https://www.linkedin.com/in/alancanto)
- © 2025-2026 Todos los derechos reservados

---

**Versión**: 2.0 Simplificada  
**Última actualización**: 2025  
**Estado**: ✅ Funcional y estable

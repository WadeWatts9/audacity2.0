# 🚀 AUDACITY - Sistema de Contadores en Tiempo Real

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.18+-blue.svg" alt="Express">
  <img src="https://img.shields.io/badge/Socket.IO-4.7+-orange.svg" alt="Socket.IO">
  <img src="https://img.shields.io/badge/SQLite-3.44+-lightblue.svg" alt="SQLite">
  <img src="https://img.shields.io/badge/PM2-5.0+-red.svg" alt="PM2">
  <img src="https://img.shields.io/badge/Nginx-1.24+-green.svg" alt="Nginx">
  <img src="https://img.shields.io/badge/Ubuntu-22.04+-purple.svg" alt="Ubuntu">
</div>

---

## 📋 Descripción del Proyecto

**AUDACITY** es un sistema de contadores en tiempo real desarrollado para gestión de saldos y operaciones financieras. La aplicación permite a múltiples usuarios (contadores y administradores) realizar operaciones simultáneas con actualizaciones instantáneas a través de WebSockets.

### 🎯 Características Principales

- ✅ **Tiempo Real** - Actualizaciones instantáneas con WebSockets
- ✅ **Base de Datos Persistente** - SQLite para almacenamiento confiable
- ✅ **Interfaz Responsive** - Optimizada para desktop, tablet y móvil
- ✅ **Sistema de Roles** - Contadores y administradores con permisos específicos
- ✅ **Operaciones Avanzadas** - Porcentajes, transferencias, duplicación y división
- ✅ **Panel de Administración** - Control total del sistema
- ✅ **Despliegue en VPS** - Optimizado para producción

---

## 🛠️ Stack Tecnológico

### **Backend**
- **Node.js** `v18+` - Runtime de JavaScript
- **Express.js** `v4.18+` - Framework web minimalista
- **Socket.IO** `v4.7+` - Comunicación en tiempo real
- **SQLite3** `v5.1+` - Base de datos embebida

### **Frontend**
- **HTML5** - Estructura semántica
- **CSS3** - Estilos responsive con Flexbox y Grid
- **JavaScript ES6+** - Lógica del cliente
- **Font Awesome** `v6.0+` - Iconografía

### **Infraestructura**
- **PM2** `v5.0+` - Gestor de procesos para Node.js
- **Nginx** `v1.24+` - Servidor web y proxy reverso
- **Ubuntu** `22.04+` - Sistema operativo del servidor
- **Hostinger VPS** - Proveedor de hosting

### **Herramientas de Desarrollo**
- **Git** - Control de versiones
- **npm** - Gestor de paquetes
- **ESLint** - Linter de código
- **VS Code** - Editor recomendado

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de       │
│   (Browser)     │◄──►│   (Node.js)     │◄──►│   Datos         │
│                 │    │                 │    │   (SQLite)      │
│ • HTML5         │    │ • Express.js    │    │                 │
│ • CSS3          │    │ • Socket.IO     │    │ • balances      │
│ • JavaScript    │    │ • PM2           │    │ • operations    │
└─────────────────┘    └─────────────────┘    │ • locks         │
                                              └─────────────────┘
```

### **Flujo de Datos**
1. **Cliente** envía operación vía WebSocket
2. **Servidor** valida y procesa la operación
3. **Base de Datos** actualiza los saldos
4. **Servidor** notifica a todos los clientes conectados
5. **Clientes** reciben actualización en tiempo real

---

## 👥 Sistema de Usuarios

### **Administrador**
- **Usuario**: `alan`
- **Rol**: Control total del sistema
- **Permisos**:
  - Operar en todas las cuentas
  - Establecer montos específicos
  - Dividir saldo del banco
  - Reiniciar todos los saldos
  - Establecer saldo del banco manualmente

### **Contadores**
| Usuario | Contraseña | Contador Asignado |
|---------|------------|-------------------|
| `contador_gallo` | `galloazul` | Gallo |
| `contador_leon` | `reyleon` | León |
| `contador_perro` | `dalmata` | Perro |
| `contador_mano` | `guante` | Mano |
| `contador_estrella` | `brillante` | Estrella |

**Permisos de Contadores**:
- Operar únicamente en su contador asignado
- Realizar todas las operaciones disponibles
- Transferir a otras cuentas (solo por porcentaje)

---

## ⚙️ Operaciones Disponibles

### **Operaciones Básicas**
- ➕ **Sumar Monto** - Agregar cantidad específica
- ➖ **Restar Monto** - Quitar cantidad específica
- 🎯 **Establecer** - Fijar saldo exacto

### **Operaciones de Porcentaje**
- 📈 **Sumar % de mi saldo** - Agregar porcentaje del saldo actual
- 📉 **Restar % de mi saldo** - Quitar porcentaje del saldo actual

### **Operaciones de Transferencia**
- 🔄 **Transferir % a otra cuenta** - Transferir porcentaje a otro contador
- 🏦 **Transferir % al banco** - Transferir porcentaje al banco central

### **Operaciones de Saldo**
- 🔄 **Duplicar saldo** - Multiplicar saldo por 2
- ✂️ **Dividir saldo** - Dividir saldo entre número específico (2-100)

### **Operaciones de Administración** (Solo Admin)
- 🎯 **Establecer Monto Específico** - Configurar saldos de todas las cuentas
- 🏦 **Establecer Saldo del Banco** - Configurar saldo del banco central
- 📊 **Dividir Saldo del Banco** - Distribuir saldo del banco entre contadores
- 🔄 **Reiniciar Todos** - Volver a saldos iniciales ($TDL 10,000)

---

## 🚀 Instalación y Despliegue

### **Requisitos del Sistema**
- **Sistema Operativo**: Ubuntu 22.04 LTS o superior
- **RAM**: Mínimo 1GB (Recomendado 2GB+)
- **Almacenamiento**: 10GB libres
- **Conexión**: Ancho de banda estable

### **Instalación Automática**

```bash
# 1. Clonar el repositorio
git clone https://github.com/WadeWatts9/audacity2.0.git
cd audacity2.0

# 2. Ejecutar script de instalación
chmod +x install.sh
./install.sh
```

### **Instalación Manual**

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias del sistema
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

**Configuración de Nginx**:
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

---

## 📁 Estructura del Proyecto

```
audacity2.0/
├── 📄 server-simple.js          # Servidor principal
├── 📄 index-simple.html         # Interfaz de usuario
├── 📄 script-simple.js          # Lógica del frontend
├── 📄 styles-responsive.css     # Estilos responsive
├── 📄 database.js               # Wrapper de SQLite
├── 📄 ecosystem.config.js       # Configuración PM2
├── 📄 install.sh                # Script de instalación
├── 📄 package.json              # Dependencias y scripts
├── 📄 README.md                 # Documentación
└── 📁 logs/                     # Logs de la aplicación
    ├── audacity-app-out.log
    └── audacity-app-error.log
```

---

## 🗄️ Base de Datos

### **Esquema de Tablas**

#### **balances**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `counter_name` | TEXT | Nombre del contador |
| `balance` | REAL | Saldo actual |
| `updated_at` | DATETIME | Última actualización |

#### **operations**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `username` | TEXT | Usuario que realizó la operación |
| `operation` | TEXT | Tipo de operación |
| `counter` | TEXT | Contador afectado |
| `amount` | REAL | Monto involucrado |
| `description` | TEXT | Descripción de la operación |
| `created_at` | DATETIME | Fecha y hora |

#### **locks**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | Clave primaria |
| `counter_name` | TEXT | Nombre del contador |
| `locked_by` | TEXT | Usuario que bloqueó |
| `created_at` | DATETIME | Fecha del bloqueo |

---

## 🔧 Comandos de Gestión

### **Gestión de la Aplicación**
```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs audacity-app

# Reiniciar aplicación
pm2 restart audacity-app

# Parar aplicación
pm2 stop audacity-app

# Iniciar aplicación
pm2 start audacity-app

# Ver logs específicos
pm2 logs audacity-app --lines 50
```

### **Gestión de la Base de Datos**
```bash
# Ver saldos actuales
sqlite3 audacity.db "SELECT * FROM balances;"

# Ver operaciones recientes
sqlite3 audacity.db "SELECT * FROM operations ORDER BY created_at DESC LIMIT 10;"

# Backup de la base de datos
cp audacity.db audacity_backup_$(date +%Y%m%d_%H%M%S).db

# Verificar integridad
sqlite3 audacity.db "PRAGMA integrity_check;"
```

### **Gestión del Servidor**
```bash
# Ver estado de Nginx
sudo systemctl status nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver uso de recursos
htop
df -h
free -h
```

---

## 🌐 Acceso y URLs

### **Acceso Principal**
- **URL**: `http://TU_IP_DEL_VPS`
- **Puerto**: 80 (HTTP)
- **Protocolo**: HTTP/HTTPS (configurable)

### **Endpoints de la API**
- **WebSocket**: `ws://TU_IP_DEL_VPS/socket.io/`
- **Estático**: `http://TU_IP_DEL_VPS/` (archivos estáticos)

---

## 🔒 Seguridad

### **Medidas Implementadas**
- ✅ **Validación de entrada** - Todos los datos son validados
- ✅ **Sanitización** - Prevención de inyección SQL
- ✅ **Autenticación** - Sistema de usuarios y contraseñas
- ✅ **Autorización** - Controles de acceso por rol
- ✅ **HTTPS Ready** - Preparado para certificados SSL

### **Recomendaciones**
- Configurar firewall (UFW)
- Implementar HTTPS con Let's Encrypt
- Realizar backups regulares
- Monitorear logs de acceso
- Actualizar dependencias regularmente

---

## 🐛 Solución de Problemas

### **Problemas Comunes**

#### **La aplicación no inicia**
```bash
# Verificar logs
pm2 logs audacity-app

# Verificar puerto
netstat -tlnp | grep :3000

# Verificar dependencias
npm list
```

#### **No se actualizan los saldos**
```bash
# Verificar base de datos
sqlite3 audacity.db "SELECT * FROM balances;"

# Verificar WebSocket
# Abrir consola del navegador (F12)
# Verificar conexión en Network tab
```

#### **Error de permisos**
```bash
# Corregir permisos
sudo chown -R root:root /var/www/audacity
sudo chmod -R 755 /var/www/audacity
```

#### **Nginx no funciona**
```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Reiniciar servicio
sudo systemctl restart nginx
```

---

## 📊 Monitoreo y Mantenimiento

### **Métricas Importantes**
- **CPU Usage**: `htop` o `top`
- **Memory Usage**: `free -h`
- **Disk Usage**: `df -h`
- **Network**: `netstat -tlnp`
- **Processes**: `pm2 monit`

### **Logs a Monitorear**
- **Aplicación**: `/root/.pm2/logs/`
- **Nginx**: `/var/log/nginx/`
- **Sistema**: `/var/log/syslog`

### **Tareas de Mantenimiento**
- **Diario**: Verificar estado de la aplicación
- **Semanal**: Revisar logs de errores
- **Mensual**: Backup de la base de datos
- **Trimestral**: Actualizar dependencias

---

## 🚀 Roadmap y Mejoras Futuras

### **Versión 2.1**
- [ ] Implementar HTTPS con Let's Encrypt
- [ ] Panel de estadísticas avanzadas
- [ ] Exportación de reportes en PDF
- [ ] Notificaciones push

### **Versión 2.2**
- [ ] API REST completa
- [ ] Integración con sistemas externos
- [ ] Dashboard de administración avanzado
- [ ] Sistema de auditoría mejorado

### **Versión 3.0**
- [ ] Migración a PostgreSQL
- [ ] Microservicios
- [ ] Docker containerization
- [ ] CI/CD pipeline

---

## 👨‍💻 Desarrollador

**Alan Canto**
- **LinkedIn**: [linkedin.com/in/alancanto](https://www.linkedin.com/in/alancanto)
- **GitHub**: [github.com/WadeWatts9](https://github.com/WadeWatts9)
- **Email**: [Contacto disponible en LinkedIn]

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

```
MIT License

Copyright (c) 2025-2026 Alan Canto

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📞 Soporte

Para soporte técnico o consultas:

- **Issues**: [GitHub Issues](https://github.com/WadeWatts9/audacity2.0/issues)
- **Documentación**: Este README
- **Contacto**: [LinkedIn](https://www.linkedin.com/in/alancanto)

---

<div align="center">
  <p><strong>Desarrollado con ❤️ por Alan Canto</strong></p>
  <p>© 2025-2026 Todos los derechos reservados</p>
</div>
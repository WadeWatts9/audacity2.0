# 🚀 Guía de Despliegue en Hostinger VPS

## 📋 Preparación del Proyecto

### Archivos necesarios (ya están listos):
```
audacity2.0/
├── server-db.js           # Servidor principal con base de datos
├── server.js              # Servidor original (sin BD)
├── database.js            # Clase de manejo de base de datos
├── index.html             # Interfaz de usuario
├── script.js              # Lógica del cliente
├── styles.css             # Estilos
├── package.json           # Dependencias (incluye SQLite)
├── package-lock.json      # Lock de dependencias
├── node_modules/          # Dependencias (se instalarán en el servidor)
├── audacity.db            # Base de datos SQLite (se crea automáticamente)
└── README.md              # Documentación
```

### 🗄️ Base de Datos SQLite
- **Tipo**: SQLite (archivo local, no requiere servidor separado)
- **Ventajas**: Ligera, rápida, perfecta para VPS
- **Persistencia**: Los datos se mantienen entre reinicios
- **Backup**: Solo necesitas copiar el archivo `audacity.db`

## 🔧 Configuración del Servidor VPS

### 1. Acceder al VPS de Hostinger
```bash
# Conectar por SSH (reemplaza con tu IP y usuario)
ssh root@TU_IP_DEL_VPS
```

### 2. Instalar Node.js y dependencias (si no están instalados)
```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (versión LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar dependencias del sistema para SQLite
sudo apt-get install -y build-essential python3-dev

# Verificar instalación
node --version
npm --version
```

### 3. Instalar PM2 (Gestor de procesos)
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar automáticamente
pm2 startup
# Seguir las instrucciones que aparezcan
```

## 📁 Subir el Proyecto

### Opción 1: Usando SCP (Recomendado)
```bash
# Desde tu computadora local, comprimir el proyecto
# (excluyendo node_modules para subir más rápido)
tar -czf audacity-project.tar.gz --exclude=node_modules .

# Subir al servidor
scp audacity-project.tar.gz root@TU_IP_DEL_VPS:/root/

# En el servidor, extraer
ssh root@TU_IP_DEL_VPS
cd /root
tar -xzf audacity-project.tar.gz
mkdir -p /var/www/audacity
mv * /var/www/audacity/
cd /var/www/audacity
```

### Opción 2: Usando Git (Si tienes repositorio)
```bash
# En el servidor
cd /var/www
git clone https://github.com/tu-usuario/audacity2.0.git
cd audacity2.0
```

## ⚙️ Configuración del Proyecto

### 1. Instalar dependencias
```bash
cd /var/www/audacity
npm install --production

# Verificar que SQLite se instaló correctamente
node -e "console.log('SQLite version:', require('sqlite3').VERSION)"
```

### 2. Configurar el servidor para producción
Crear archivo `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'audacity-app',
    script: 'server-db.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### 3. Configurar Nginx (Proxy Reverso)
```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración del sitio
sudo nano /etc/nginx/sites-available/audacity
```

Contenido del archivo de configuración de Nginx:
```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

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

### 4. Activar el sitio
```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/audacity /etc/nginx/sites-enabled/

# Eliminar configuración por defecto
sudo rm /etc/nginx/sites-enabled/default

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 🔒 Configurar SSL (Opcional pero recomendado)

### Usando Certbot (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d TU_DOMINIO

# Verificar renovación automática
sudo certbot renew --dry-run
```

## 🚀 Iniciar la Aplicación

### 1. Iniciar con PM2
```bash
cd /var/www/audacity
pm2 start ecosystem.config.js
```

### 2. Guardar configuración de PM2
```bash
pm2 save
```

### 3. Verificar estado
```bash
pm2 status
pm2 logs audacity-app
```

## 🔧 Configuración del Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verificar estado
sudo ufw status
```

## 📊 Monitoreo y Mantenimiento

### Comandos útiles:
```bash
# Ver logs en tiempo real
pm2 logs audacity-app --lines 100

# Reiniciar aplicación
pm2 restart audacity-app

# Ver estado de la aplicación
pm2 status

# Ver uso de memoria
pm2 monit

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### 🗄️ Gestión de Base de Datos

#### Backup de la base de datos:
```bash
# Crear backup
cp /var/www/audacity/audacity.db /var/www/audacity/backups/audacity_$(date +%Y%m%d_%H%M%S).db

# Crear directorio de backups
mkdir -p /var/www/audacity/backups

# Backup automático diario (agregar a crontab)
# 0 2 * * * cp /var/www/audacity/audacity.db /var/www/audacity/backups/audacity_$(date +\%Y\%m\%d).db
```

#### Verificar integridad de la base de datos:
```bash
cd /var/www/audacity
sqlite3 audacity.db "PRAGMA integrity_check;"
```

#### Ver datos de la base de datos:
```bash
cd /var/www/audacity
sqlite3 audacity.db "SELECT * FROM balances;"
sqlite3 audacity.db "SELECT * FROM operations ORDER BY created_at DESC LIMIT 10;"
```

## 🌐 Acceso a la Aplicación

Una vez configurado todo:
- **URL**: `http://TU_IP_DEL_VPS` o `https://TU_DOMINIO`
- **Puerto**: 80 (HTTP) o 443 (HTTPS)
- **Credenciales**: Las mismas que en local

## 🔑 Credenciales de Acceso

### Administrador
- **Usuario**: `alan`
- **Contraseña**: `20243`

### Contadores
- **Gallo**: `contador_gallo` / `galloazul`
- **León**: `contador_leon` / `reyleon`
- **Perro**: `contador_perro` / `dalmata`
- **Mano**: `contador_mano` / `guante`
- **Estrella**: `contador_estrella` / `brillante`

## 🛠️ Solución de Problemas

### Si la aplicación no inicia:
```bash
# Verificar logs
pm2 logs audacity-app

# Verificar puerto
sudo netstat -tlnp | grep :3000

# Reiniciar PM2
pm2 kill
pm2 start ecosystem.config.js
```

### Si Nginx no funciona:
```bash
# Verificar configuración
sudo nginx -t

# Ver logs de error
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Si hay problemas de permisos:
```bash
# Dar permisos correctos
sudo chown -R www-data:www-data /var/www/audacity
sudo chmod -R 755 /var/www/audacity
```

## 📝 Notas Importantes

1. **Puerto**: La aplicación corre en el puerto 3000 internamente
2. **Nginx**: Actúa como proxy reverso en el puerto 80/443
3. **PM2**: Mantiene la aplicación ejecutándose automáticamente
4. **SSL**: Recomendado para producción
5. **Firewall**: Configurado para permitir tráfico web
6. **Logs**: Monitorear regularmente para detectar problemas

## 🎯 Resumen de Pasos

1. ✅ Limpiar proyecto (completado)
2. 🔧 Configurar VPS con Node.js y PM2
3. 📁 Subir archivos del proyecto
4. ⚙️ Instalar dependencias
5. 🌐 Configurar Nginx como proxy
6. 🔒 Configurar SSL (opcional)
7. 🚀 Iniciar aplicación con PM2
8. 🔧 Configurar firewall
9. ✅ Probar acceso

---

**Desarrollado por**: Alan Canto  
**Versión**: 2.0  
**Fecha**: 2025

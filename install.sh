#!/bin/bash

echo "🚀 Instalando AUDACITY - Sistema de Contadores"
echo "=============================================="

# Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependencias del sistema
echo "🔧 Instalando dependencias del sistema..."
sudo apt install -y build-essential python3-dev sqlite3 curl wget git nano htop

# Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
echo "📦 Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx
echo "📦 Instalando Nginx..."
sudo apt install -y nginx

# Instalar dependencias del proyecto
echo "📦 Instalando dependencias del proyecto..."
npm install --production

# Crear directorio del proyecto
echo "📁 Configurando directorio del proyecto..."
sudo mkdir -p /var/www/audacity
sudo chown -R root:root /var/www/audacity

# Copiar archivos
echo "📋 Copiando archivos..."
cp -r . /var/www/audacity/
cd /var/www/audacity

# Configurar Nginx
echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/audacity > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Activar sitio
sudo ln -s /etc/nginx/sites-available/audacity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Iniciar aplicación
echo "🚀 Iniciando aplicación..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Instalación completada!"
echo "🌐 Accede a: http://$(curl -s ifconfig.me)"
echo ""
echo "🔑 Credenciales:"
echo "   Admin: alan / 20243"
echo "   Gallo: contador_gallo / galloazul"
echo "   León: contador_leon / reyleon"
echo "   Perro: contador_perro / dalmata"
echo "   Mano: contador_mano / guante"
echo "   Estrella: contador_estrella / brillante"
echo ""
echo "📊 Comandos útiles:"
echo "   pm2 status          - Ver estado"
echo "   pm2 logs audacity-app - Ver logs"
echo "   pm2 restart audacity-app - Reiniciar"
echo "   pm2 stop audacity-app - Parar"

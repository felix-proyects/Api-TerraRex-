#!/bin/bash

NC='\033[0m'
GREEN='\033[0.32m'
CYAN='\033[0.36m'
RED='\033[0.31m'
YELLOW='\033[1.33m'

clear
echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}          INSTALADOR AUTOMÁTICO API KAZUMA          ${NC}"
echo -e "${CYAN}====================================================${NC}"

read -p "Ingresa tu dominio (ej: api.kazuma.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: El dominio es obligatorio.${NC}"
    exit 1
fi

read -p "Nombre para la Base de Datos (ej: kazuma_db): " DB_NAME
read -p "Usuario para la Base de Datos (ej: kazuma_user): " DB_USER
read -p "Contraseña para la Base de Datos: " DB_PASS

echo -e "\n${CYAN}[1/7] Actualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "\n${CYAN}[2/7] Instalando Node.js, MariaDB y herramientas...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx build-essential ffmpeg mariadb-server

echo -e "\n${CYAN}[3/7] Configurando MariaDB...${NC}"
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
sudo mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
sudo mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo -e "\n${CYAN}[4/7] Creando archivo de configuración .env...${NC}"
cat > .env <<EOF
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_HOST=localhost
PORT=880
EOF

echo -e "\n${CYAN}[5/7] Instalando PM2 y Dependencias...${NC}"
sudo npm install -g pm2
npm install

echo -e "\n${CYAN}[6/7] Configurando Nginx...${NC}"
CONF_FILE="/etc/nginx/sites-available/$DOMAIN"
sudo bash -c "cat > $CONF_FILE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"

sudo ln -s $CONF_FILE /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo -e "\n${CYAN}[7/7] Configurando SSL con Certbot...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

echo -e "\n${GREEN}Iniciando Api Kazuma con PM2...${NC}"
pm2 start server.js --name "api-kazuma"
pm2 save
pm2 startup

echo -e "\n${CYAN}====================================================${NC}"
echo -e "${GREEN}     ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${YELLOW}Dominio:${NC} https://$DOMAIN"
echo -e "${YELLOW}DB Name:${NC} $DB_NAME"
echo -e "${YELLOW}DB User:${NC} $DB_USER"
echo -e "${CYAN}====================================================${NC}"
#!/bin/bash

# --- COLORES ---
NC='\033[0m'
GREEN='\033[0.32m'
CYAN='\033[0.36m'
RED='\033[0.31m'
YELLOW='\033[1.33m'

clear
echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}          INSTALADOR AUTOMÁTICO API KAZUMA          ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${YELLOW}Preparado por Félix Ofc & Gemini AI${NC}"

# --- SOLICITUD DE DATOS ---
read -p "Ingresa tu dominio (ej: api.kazuma.giize.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: El dominio es obligatorio.${NC}"
    exit 1
fi

# --- ACTUALIZACIÓN DEL SISTEMA ---
echo -e "\n${CYAN}[1/6] Actualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y

# --- INSTALACIÓN DE NODE.JS ---
echo -e "\n${CYAN}[2/6] Instalando Node.js y dependencias...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx build-essential ffmpeg

# --- INSTALACIÓN DE PM2 ---
echo -e "\n${CYAN}[3/6] Configurando PM2 (Gestor de procesos)...${NC}"
sudo npm install -g pm2

# --- INSTALACIÓN DE DEPENDENCIAS DEL PROYECTO ---
echo -e "\n${CYAN}[4/6] Instalando dependencias de la API...${NC}"
npm install

# --- CONFIGURACIÓN DE NGINX ---
echo -e "\n${CYAN}[5/6] Configurando Nginx como Proxy Inverso...${NC}"
CONF_FILE="/etc/nginx/sites-available/$DOMAIN"
sudo bash -c "cat > $CONF_FILE <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3032;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EOF"

sudo ln -s $CONF_FILE /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# --- SSL CON CERTBOT ---
echo -e "\n${CYAN}[6/6] Configurando SSL (HTTPS) con Certbot...${NC}"
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

# --- LANZAMIENTO ---
echo -e "\n${GREEN}Iniciando Api Kazuma con PM2...${NC}"
pm2 start server.js --name "api-kazuma"
pm2 save
pm2 startup

echo -e "\n${CYAN}====================================================${NC}"
echo -e "${GREEN}     ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${YELLOW}Dominio:${NC} https://$DOMAIN"
echo -e "${YELLOW}Estado:${NC} Online (Gestionado por PM2)"
echo -e "${CYAN}====================================================${NC}"
#!/bin/bash

# Define correct directories based on how SCP will likely behave
# Ideally, we upload the 'InteliPark' folder to /home/intelipark/
BASE_DIR="/home/intelipark/InteliPark"
BACKEND_DIR="$BASE_DIR/Backend"
FRONTEND_DIR="$BASE_DIR/Frontend"

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "\n${GREEN}=== Starting InteliPark Server Deployment ===${NC}\n"

# 1. Update System and Install Dependencies
echo -e "${GREEN}[1/7] Updating System and Installing Dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx \
    mosquitto mosquitto-clients nodejs npm build-essential

# 2. Database Setup
echo -e "\n${GREEN}[2/7] Setting up PostgreSQL...${NC}"
# Check if user exists, if not create
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" | grep -q 1; then
    echo "Creating Postgres user..."
    # Config default is user:postgres pass:root. 
    # NOTE: In production, change this! We are matching your Config.py defaults for simplicity.
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'root';" 
else
    echo "Postgres user exists. Ensuring password match [Development Defaults]..."
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'root';"
fi

# Create DB
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw smart_parking_db; then
    echo "Creating Database smart_parking_db..."
    sudo -u postgres createdb smart_parking_db
else
    echo "Database smart_parking_db already exists."
fi

# 3. Configure Mosquitto (MQTT)
echo -e "\n${GREEN}[3/7] Configuring Mosquitto...${NC}"
# We need to ensure it listens on all interfaces if devices are external
APP_MOSQUITTO_CONF="/etc/mosquitto/conf.d/intelipark.conf"
if [ ! -f "$APP_MOSQUITTO_CONF" ]; then
    echo "listener 1883" | sudo tee $APP_MOSQUITTO_CONF
    echo "allow_anonymous true" | sudo tee -a $APP_MOSQUITTO_CONF
    sudo systemctl restart mosquitto
    echo "Mosquitto configured to listen on 1883 (0.0.0.0)"
else
    echo "Mosquitto config exists."
fi

# 4. Backend Setup
echo -e "\n${GREEN}[4/7] Setting up Backend...${NC}"
cd $BACKEND_DIR || exit 1

if [ ! -d "venv" ]; then
    echo "Creating Python Virtual Environment..."
    python3 -m venv venv
fi

echo "Installing Python Dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "Running Database Migrations..."
# Create a .env if not exists, matching defaults or creating one
if [ ! -f ".env" ]; then
    echo "Creating Default .env for Backend..."
    cat > .env <<EOF
DEBUG=False
PROJECT_NAME="InteliPark System"
API_V1_STR="/api/v1"
BACKEND_CORS_ORIGINS=["http://localhost","http://localhost:5173","http://192.168.2.146"]
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=smart_parking_db
SECRET_KEY=PleaseChanGE_THis_IN_Production_Too_Weak_For_Real_Use
EOF
fi

# Run Migration
alembic upgrade head

# 5. Frontend Setup
echo -e "\n${GREEN}[5/7] Setting up Frontend...${NC}"
cd $FRONTEND_DIR || exit 1

echo "Installing Node Dependencies..."
npm install

echo "Building Frontend for Production..."
# Create .env for build
echo "VITE_API_BASE=http://192.168.2.146" > .env.production
npm run build

echo "Frontend built to $FRONTEND_DIR/dist"

# 6. Configure Service and Nginx
echo -e "\n${GREEN}[6/7] Configuring Services...${NC}"

# Backend Service
sudo cp $BASE_DIR/deployment/intelipark-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable intelipark-backend
sudo systemctl restart intelipark-backend

# Nginx
sudo cp $BASE_DIR/deployment/intelipark-nginx /etc/nginx/sites-available/intelipark
# Link if not linked
if [ ! -L "/etc/nginx/sites-enabled/intelipark" ]; then
    sudo ln -s /etc/nginx/sites-available/intelipark /etc/nginx/sites-enabled/
    sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

echo "Verifying Nginx Config..."
sudo nginx -t && sudo systemctl restart nginx

# 7. Final Check
echo -e "\n${GREEN}[7/7] Deployment Complete!${NC}"
echo "Backend Status:"
systemctl status intelipark-backend --no-pager | head -n 5
echo "Nginx Status:"
systemctl status nginx --no-pager | head -n 5

echo -e "\n${GREEN}Visit http://192.168.2.146 to see your application.${NC}"

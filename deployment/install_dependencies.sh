#!/bin/bash

# ==========================================
# InteliPark System Dependencies Installer
# ==========================================

echo "Updating system package list..."
sudo apt update
sudo apt upgrade -y

echo "Installing Basic Tools..."
sudo apt install -y curl build-essential unzip

# ----------------- 1. Install PostgreSQL -----------------
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and Enable Postgres
sudo systemctl enable postgresql
sudo systemctl start postgresql
echo "PostgreSQL Status: $(systemctl is-active postgresql)"

# ----------------- 2. Install Nginx -----------------
echo "Installing Nginx..."
sudo apt install -y nginx

# Start and Enable Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo "Nginx Status: $(systemctl is-active nginx)"

# ----------------- 4. Install Mosquitto (MQTT Broker) -----------------
echo "Installing Mosquitto..."
sudo apt install -y mosquitto mosquitto-clients

# Start and Enable Mosquitto
sudo systemctl enable mosquitto
sudo systemctl start mosquitto
echo "Mosquitto Status: $(systemctl is-active mosquitto)"

# ----------------- 5. Install Python & Gunicorn -----------------
echo "Installing Python Environment..."
sudo apt install -y python3-pip python3-venv

echo "=========================================="
echo "Installation Complete!"
echo "=========================================="

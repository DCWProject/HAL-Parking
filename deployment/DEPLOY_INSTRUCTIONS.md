# InteliPark Deployment Guide

This guide details exactly how to deploy the InteliPark application to your local server (`192.168.2.146`) with a fresh OS install.

## Prerequisites

- Access to the target server via SSH or physical terminal.
- Use the **System Administrator** account initially (root) to create the user, or use sudo.
- This guide assumes the server IP is `192.168.2.146`.

---

## Step 1: Create the User and Upload Files

**On the Server Console (as root or sudo user):**

1.  **Create the user `intelipark`**:

    ```bash
    sudo adduser intelipark
    # Follow the prompts to set a password.

    # Add intelipark to sudo group for administrative tasks
    sudo usermod -aG sudo intelipark
    ```

**On Your PC (Local Machine):**

2.  **Upload the Code**:
    Open a terminal (PowerShell or CMD) in your project folder (`e:\INTELISPARKZ`) and copy the `InteliPark` folder to the server.

    _Using SCP (Password required):_

    ```powershell
    # Make sure you are in e:\INTELISPARKZ
    scp -r .\InteliPark intelipark@192.168.2.146:/home/intelipark/
    ```

    _Authentication Note:_ Enter the password you created for the `intelipark` user when prompted.

---

## Step 2: System Setup (On Server)

**Login to the server as `intelipark`:**

```bash
ssh intelipark@192.168.2.146
```

**Run the following commands one by one:**

### 1. Update System and Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv postgresql postgresql-contrib nginx mosquitto mosquitto-clients nodejs npm build-essential
```

### 2. Configure Database (PostgreSQL)

We will create the database `smart_parking_db` and ensure the password matches the default configuration (for simplicity).

```bash
sudo -u postgres psql
```

_(This opens the SQL prompt)_

Run these SQL commands:

```sql
ALTER USER postgres PASSWORD 'nopassword';
CREATE DATABASE smart_parking_db;
\q
```

### 3. Configure MQTT Broker (Mosquitto)

Ensure Mosquitto allows connections from your ESP32 devices.

```bash
# Create a config file to listen on all interfaces
echo "listener 1883" | sudo tee /etc/mosquitto/conf.d/local_access.conf
echo "allow_anonymous true" | sudo tee -a /etc/mosquitto/conf.d/local_access.conf

# Restart Mosquitto
sudo systemctl restart mosquitto
```

---

## Step 3: Backend Deployment

Navigate to the Backend directory:

```bash
cd /home/intelipark/InteliPark/Backend
```

1.  **Create Virtual Environment**:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install Dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

3.  **Setup Environment Variables**:
    Create a `.env` file:

    ```bash
    nano .env
    ```

    Paste the following content (Ctrl+Shift+V usually):

    ```env
    DEBUG=False
    PROJECT_NAME="InteliPark"
    API_V1_STR="/api/v1"
    BACKEND_CORS_ORIGINS=["http://localhost","http://localhost:5173","http://192.168.2.146"]

    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=root
    POSTGRES_SERVER=localhost
    POSTGRES_PORT=5432
    POSTGRES_DB=smart_parking_db

    # Change this to a random long string for production security!
    SECRET_KEY=ChangeMeToSomethingSecure123!
    ```

    _Save and exit (Ctrl+O, Enter, Ctrl+X)._

4.  **Run Migrations**:

    ```bash
    alembic upgrade head
    ```

5.  **Setup Systemd Service**:
    We have provided a service file in `deployment/intelipark-backend.service`.

    ```bash
    sudo cp /home/intelipark/InteliPark/deployment/intelipark-backend.service /etc/systemd/system/

    # Reload and Start
    sudo systemctl daemon-reload
    sudo systemctl start intelipark-backend
    sudo systemctl enable intelipark-backend
    ```

    Check status:

    ```bash
    sudo systemctl status intelipark-backend
    ```

    _(It should say "active (running)")_

---

## Step 4: Frontend Deployment

Navigate to the Frontend directory:

```bash
cd /home/intelipark/InteliPark/Frontend
```

1.  **Install Dependencies**:

    ```bash
    npm install
    ```

2.  **Configure Environment for Build**:
    Create `.env.production`:

    ```bash
    echo "VITE_API_BASE=http://192.168.2.146" > .env.production
    ```

3.  **Build the Project**:
    ```bash
    npm run build
    ```
    _(This creates a `dist` folder with the static files)_

---

## Step 5: Nginx Configuration (Web Server)

We will configure Nginx to serve the Frontend and proxy API requests to the Backend.

1.  **Copy Configuration**:

    ```bash
    sudo cp /home/intelipark/InteliPark/deployment/intelipark-nginx /etc/nginx/sites-available/intelipark
    ```

2.  **Enable Site**:

    ```bash
    sudo ln -s /etc/nginx/sites-available/intelipark /etc/nginx/sites-enabled/

    # Remove default site if it exists
    sudo rm /etc/nginx/sites-enabled/default
    ```

3.  **Test and Restart Nginx**:
    ```bash
    sudo nginx -t
    # If successful:
    sudo systemctl restart nginx
    ```

## Success!

Open a browser on your LAN and visit: **http://192.168.2.146**

- You should see the InteliPark application.
- API is available at `/api/v1`.
- MQTT Broker is listening on `192.168.2.146:1883`.

---

### Troubleshooting

- **502 Bad Gateway?** Check if Backend is running: `sudo systemctl status intelipark-backend`.
- **Database Error?** Check if Postgres is running: `sudo systemctl status postgresql`.
- **Frontend not loading?** Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`.
- **ESP32 not connecting?** Ensure the firewall allows port 1883: `sudo ufw allow 1883` (if ufw is enabled).
- **Nginx "Permission Denied" or 403 Forbidden?**
  Nginx runs as the `www-data` user and needs permission to "enter" your home directory to see the files. Run this command to fix it:
  ```bash
  # Give read/execute permission to the directory path
  chmod 755 /home/intelipark
  chmod 755 /home/intelipark/InteliPark
  chmod 755 /home/intelipark/InteliPark/Frontend
  chmod 755 /home/intelipark/InteliPark/Frontend/dist
  ```

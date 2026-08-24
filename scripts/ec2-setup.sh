#!/usr/bin/env bash
# ==============================================================================
# Discode Single EC2 Auto-Bootstrap Script
# Sets up Docker, Docker Compose, and launches Discode for Mobile & Web Testing.
# ==============================================================================
set -e

echo "🚀 Starting Discode Single EC2 Setup..."

# 1. Update system packages
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker Engine..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
fi

# 3. Create deployment directory
DEPLOY_DIR="/opt/discode"
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

# 4. Clone or copy repository
if [ ! -d "$DEPLOY_DIR/.git" ]; then
    echo "📥 Cloning Discode Repository..."
    git clone https://github.com/dilip98914/discode.git $DEPLOY_DIR || true
fi

cd $DEPLOY_DIR

# 5. Ensure .env file exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "⚙️ Initializing default .env configuration..."
    if [ -f "$DEPLOY_DIR/.env.example" ]; then
        cp $DEPLOY_DIR/.env.example $DEPLOY_DIR/.env
    elif [ -f "$DEPLOY_DIR/.env.production" ]; then
        cp $DEPLOY_DIR/.env.production $DEPLOY_DIR/.env
    else
        cat << 'EOF' > $DEPLOY_DIR/.env
PORT=8080
DATABASE_URL=mysql://root:toor@db:3306/discode
DATABASE_USER=root
DATABASE_PASSWORD=toor
DATABASE_NAME=discode
DATABASE_HOST=db
DATABASE_PORT=3306
MAX_DB_CONN=50
NODE_ENV=production
MYSQL_LOCAL_PORT=6604
EOF
    fi
fi

# 6. Build and launch container stack
echo "🏗️ Building and starting Docker containers..."
sudo docker compose down || true
sudo docker compose up --build -d

# 7. Fetch Public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me || echo "<YOUR_EC2_PUBLIC_IP>")

echo "=================================================================="
echo "🎉 DISCODE IS LIVE AND READY FOR COLLABORATION!"
echo "👉 Open on your PC or Mobile Phone: http://$PUBLIC_IP:8080"
echo "=================================================================="

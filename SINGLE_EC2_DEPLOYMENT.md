# 💰 Discode Single EC2 Cheapest Deployment Guide ($0 - $5/month)
### Run Entire Discode Stack (Backend + Monaco IDE + Multi-Lang Runner + Containerized MySQL) on a Single Server

This guide provides the **absolute cheapest and simplest method** to deploy Discode. Everything runs inside a single low-cost virtual machine (AWS EC2, Hetzner, DigitalOcean, or Linode) using **Docker Compose**.

> 💡 **Total Cost:** **$0 (AWS Free Tier)** or **~$3.50–$5.00/month** (`t3.small` / `t4g.small`).
> 🚫 **No RDS charges**, 🚫 **No Load Balancer (ALB) charges**, 🚫 **No NAT Gateway charges**.

---

## 🏗️ Architecture: All-in-One Container Stack

```
           [ Any Client: Mobile Phone / Laptop / Tablet ]
                                 │
                                 ▼ (Port 8080)
┌─────────────────────────────────────────────────────────────────┐
│                   Single Ubuntu EC2 Instance                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Docker Compose Network                 │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  discode-backend (Node.js 18 + Monaco Web App)      │  │  │
│  │  │  - Port 8080                                        │  │  │
│  │  │  - Socket.IO Real-Time Sync & Multi-Cursor Flags    │  │  │
│  │  │  - Local Sandbox Runner (Py, JS, Java, Go, C, C++)  │  │  │
│  │  │  - Embedded WebRTC Audio Server (/peerjs)           │  │  │
│  │  └──────────────────────────┬──────────────────────────┘  │  │
│  │                             │ (Internal Docker Bridge)    │  │
│  │                             ▼                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  discode-db (MySQL 8.0 Container)                   │  │  │
│  │  │  - Auto-created persistent storage volume           │  │  │
│  │  │  - Auto-executes migrations (dbmate)                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 3-Minute Quick Launch on AWS EC2

### Step 1: Launch EC2 Instance in AWS Console
1. Log in to [AWS Console](https://console.aws.amazon.com/ec2/) and click **Launch Instances**.
2. **Name**: `discode-cheapest`.
3. **Application and OS Images**: **Ubuntu Server 22.04 LTS (HVM)** (64-bit x86 or ARM).
4. **Instance type**:
   - **Free Tier / Super Cheap**: `t3.small` (2 vCPU, 2 GiB RAM) or `t4g.small` (~$0.0168/hr ≈ $4/mo).
5. **Key pair (login)**: Select or create your key pair (`.pem`).
6. **Network settings (Security Group)**:
   - Check **Allow SSH traffic** (Port 22) from `Anywhere` or `My IP`.
   - Check **Allow HTTP traffic** (Port 80).
   - Check **Allow HTTPS traffic** (Port 443).
   - Click **Add security group rule**:
     - **Type**: `Custom TCP`
     - **Port range**: `8080`
     - **Source**: `0.0.0.0/0` (Anywhere IPv4).
7. **Configure Storage**: `20 GiB` GP3 SSD.
8. Click **Launch Instance**.

---

### Step 2: SSH into Instance and Run 1-Command Bootstrap

Open your terminal (PowerShell, macOS/Linux terminal) and connect to your EC2 instance:

```bash
ssh -i /path/to/your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Once logged in, paste this single command:

```bash
curl -fsSL https://raw.githubusercontent.com/dilip98914/discode/main/scripts/ec2-setup.sh | bash
```

#### What this single script does automatically:
1. Updates Ubuntu system packages.
2. Installs Docker Engine & Docker Compose plugin.
3. Clones the Discode repository to `/opt/discode`.
4. Runs `docker compose up --build -d`.
5. Starts the **MySQL 8.0 database container** and initializes tables automatically.
6. Starts the **Discode Node.js application container** with local compilers (Python, Node, Java, Go, GCC, G++).
7. Sets up automatic container restart on system reboot.

---

### Step 3: Open in Browser & Start Collaborating!

Within 2 minutes, open your browser from **any phone, tablet, or PC**:

```
http://<YOUR_EC2_PUBLIC_IP>:8080
```

- **Create a Room** or **Join a Room**.
- Share the URL with your peers or interview candidates.
- Everything works out of the box:
  - ✨ **Real-time Monaco VS Code engine** with zero typing collisions.
  - 👥 **Colored multi-cursor name flags** (e.g. *Alice*, *Bob*).
  - ⚡ **Local 6-language code compilation and execution** (Python, JS, Java, Go, C, C++).
  - 📜 **30-day code history snapshots**.
  - 🎙️ **In-room WebRTC voice chat**.

---

## 🛠️ Handy Server Management Commands

To manage your server in the future, SSH into your EC2 instance:

### 1. View Live Application Logs:
```bash
cd /opt/discode
sudo docker compose logs -f backend
```

### 2. View Database Logs:
```bash
sudo docker compose logs -f db
```

### 3. Run Automated Tests Inside the Server:
```bash
sudo docker exec discode-backend-1 npm test
```

### 4. Restart All Services:
```bash
cd /opt/discode
sudo docker compose restart
```

### 5. Update Discode to Latest Code from GitHub:
```bash
cd /opt/discode
git pull
sudo docker compose up --build -d
```

---

## 🔒 Optional: Add Free HTTPS / SSL (Let's Encrypt)
If you attach a custom domain (e.g., `code.yourdomain.com`) to your EC2 public IP:

```bash
# 1. Install Nginx & Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Configure Nginx Reverse Proxy
sudo nano /etc/nginx/sites-available/discode
```

Paste:
```nginx
server {
    server_name code.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and request free certificate:
```bash
sudo ln -s /etc/nginx/sites-available/discode /etc/nginx/sites-enabled/
sudo certbot --nginx -d code.yourdomain.com
```
Your Discode server is now accessible via **`https://code.yourdomain.com`** with free automated SSL renewals!

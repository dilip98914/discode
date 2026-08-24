# 🚀 Discode AWS Production Deployment Guide
### Complete Step-by-Step Architecture Guide for EC2 + Application Load Balancer (ALB) + Auto Scaling Group (ASG) + Target Group (TG)

This guide provides the exact production procedure to deploy Discode on AWS using only native repository files (`Dockerfile`, `docker-compose.yml`, `scripts/ec2-setup.sh`), with **zero external dependencies or Terraform complexity**.

---

## 🏗️ High-Availability Architecture Overview

```
                          [ Internet Traffic (Mobile / Desktop) ]
                                            │
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │      Application Load Balancer (ALB)      │
                      │      - Listeners: HTTP 80 / HTTPS 443     │
                      │      - SSL Termination (AWS ACM)          │
                      └─────────────────────┬─────────────────────┘
                                            │
                                            ▼
                      ┌───────────────────────────────────────────┐
                      │         Target Group (discode-tg)         │
                      │      - Port: 8080 (HTTP)                  │
                      │      - Health Check: GET /healthz         │
                      │      - Sticky Sessions: lb_cookie (86400s)│
                      └─────────────────────┬─────────────────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
            ┌──────────────────────┐                  ┌──────────────────────┐
            │ EC2 Node 1 (AZ-1a)   │                  │ EC2 Node 2 (AZ-1b)   │
            │ - Auto Scaling Group │                  │ - Auto Scaling Group │
            │ - scripts/ec2-setup  │                  │ - scripts/ec2-setup  │
            │ - Docker Compose     │                  │ - Docker Compose     │
            │   ├── Backend (8080) │                  │   ├── Backend (8080) │
            │   └── Local Runtimes │                  │   └── Local Runtimes │
            └──────────┬───────────┘                  └──────────┬───────────┘
                       │                                         │
                       └────────────────────┬────────────────────┘
                                            │ (Private Subnet)
                                            ▼
                                ┌───────────────────────┐
                                │ AWS RDS MySQL 8.0     │
                                │ (Multi-AZ DB Cluster) │
                                └───────────────────────┘
```

---

## 📋 Prerequisites
1. An active **AWS Account**.
2. A registered domain name in **AWS Route 53** or external DNS (e.g., `code.yourcompany.com`).
3. An **SSL Certificate** requested in **AWS Certificate Manager (ACM)** for HTTPS.

---

## 🛠️ Step-by-Step Deployment Procedure

---

### STEP 1: Create the RDS MySQL Database (Shared Storage)
For multi-instance EC2 auto-scaling, all nodes must share the same MySQL database instance.

1. In the AWS Console, open **RDS -> Databases -> Create database**.
2. **Engine type**: `MySQL` (Version `8.0.25` or higher).
3. **Template**: `Production` (Multi-AZ for high availability) or `Dev/Test`.
4. **Settings**:
   - **DB instance identifier**: `discode-db`
   - **Master username**: `discode`
   - **Master password**: `DiscodeSecurePass2026!`
5. **DB instance class**: `db.t3.small` (2 vCPU, 2 GiB RAM).
6. **Connectivity**:
   - **VPC**: Default VPC (or your custom VPC).
   - **Public access**: `No` (for security).
   - **VPC security group**: Create new -> `discode-rds-sg`.
7. **Additional configuration**:
   - **Initial database name**: `discode`
8. Click **Create database**.
9. Once created, note the **RDS Endpoint** (e.g., `discode-db.cxxxxxx.us-east-1.rds.amazonaws.com`).

---

### STEP 2: Configure Security Groups

Create 3 Security Groups under **EC2 -> Security Groups**:

#### 1. `discode-alb-sg` (Load Balancer Security Group)
- **Inbound Rules**:
  - `HTTP` (Port 80) from `0.0.0.0/0` (Anywhere IPv4).
  - `HTTPS` (Port 443) from `0.0.0.0/0` (Anywhere IPv4).
- **Outbound Rules**: All traffic to `0.0.0.0/0`.

#### 2. `discode-ec2-sg` (EC2 Instance Security Group)
- **Inbound Rules**:
  - `Custom TCP` (Port 8080) -> Source: `discode-alb-sg` (Only ALB can reach container).
  - `SSH` (Port 22) -> Source: `My IP` (For administration).
- **Outbound Rules**: All traffic to `0.0.0.0/0`.

#### 3. `discode-rds-sg` (Database Security Group)
- **Inbound Rules**:
  - `MySQL/Aurora` (Port 3306) -> Source: `discode-ec2-sg` (Only EC2 instances can connect to MySQL).

---

### STEP 3: Create the ALB Target Group (`discode-tg`)

The Target Group registers healthy EC2 instances and maintains WebSocket stickiness.

1. Navigate to **EC2 -> Target Groups -> Create target group**.
2. **Basic configuration**:
   - **Target type**: `Instances`
   - **Target group name**: `discode-tg`
   - **Protocol**: `HTTP`
   - **Port**: `8080`
   - **VPC**: Select your VPC.
   - **Protocol version**: `HTTP1`
3. **Health checks**:
   - **Health check protocol**: `HTTP`
   - **Health check path**: `/healthz`
   - **Healthy threshold**: `2`
   - **Unhealthy threshold**: `2`
   - **Timeout**: `5` seconds
   - **Interval**: `15` seconds
   - **Success codes**: `200`
4. Click **Create target group**.
5. **Enable WebSocket Session Stickiness (Crucial for Socket.IO)**:
   - Select `discode-tg` -> Click **Group details** tab -> Scroll to **Attributes** -> Click **Edit**.
   - Check **Stickiness**:
     - **Stickiness type**: `Load balancer generated cookie` (`lb_cookie`).
     - **Stickiness duration**: `86400` seconds (1 day).
   - Click **Save changes**.

---

### STEP 4: Create the Application Load Balancer (`discode-alb`)

1. Navigate to **EC2 -> Load Balancers -> Create load balancer**.
2. Select **Application Load Balancer** -> Click **Create**.
3. **Basic configuration**:
   - **Load balancer name**: `discode-alb`
   - **Scheme**: `Internet-facing`
   - **IP address type**: `IPv4`
4. **Network mapping**:
   - **VPC**: Select your VPC.
   - **Mappings**: Select at least two Availability Zones (e.g., `us-east-1a`, `us-east-1b`).
5. **Security groups**:
   - Select `discode-alb-sg`.
6. **Listeners and routing**:
   - **Listener 1 (HTTP:80)**:
     - Default action: Forward to `discode-tg` (or Redirect to HTTPS:443).
   - **Listener 2 (HTTPS:443)** (Optional / Recommended):
     - Default action: Forward to `discode-tg`.
     - **Default SSL/TLS certificate**: Select your ACM Certificate.
7. Click **Create load balancer**.
8. Copy the **DNS name** (e.g. `discode-alb-123456789.us-east-1.elb.amazonaws.com`).

---

### STEP 5: Create the EC2 Launch Template (`discode-template`)

The Launch Template defines the server configuration and automated startup script.

1. Navigate to **EC2 -> Launch Templates -> Create launch template**.
2. **Template name**: `discode-template`.
3. **Application and OS Images**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type` (64-bit x86).
4. **Instance type**: `t3.small` (2 vCPU, 2 GiB RAM) or `t3.medium`.
5. **Key pair**: Select your existing SSH key pair (`.pem`).
6. **Network settings**:
   - **Security groups**: Select `discode-ec2-sg`.
7. **Storage (Volumes)**:
   - Root Volume: `20 GiB` GP3 SSD.
8. **Advanced details -> User data**:
Paste the bootstrap script below (replace the `DATABASE_HOST` with your RDS endpoint from Step 1):

```bash
#!/bin/bash
set -e

# Export Database Environment Variables
export DATABASE_HOST="discode-db.cxxxxxx.us-east-1.rds.amazonaws.com"
export DATABASE_USER="discode"
export DATABASE_PASSWORD="DiscodeSecurePass2026!"
export DATABASE_NAME="discode"
export PORT="8080"
export NODE_ENV="production"

# Install Docker & Docker Compose
apt-get update -y && apt-get install -y ca-certificates curl gnupg git
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Setup Discode
DEPLOY_DIR="/opt/discode"
mkdir -p $DEPLOY_DIR
git clone https://github.com/dilip98914/discode.git $DEPLOY_DIR || true
cd $DEPLOY_DIR

# Build & Run via Docker Compose
docker compose up --build -d
```

9. Click **Create launch template**.

---

### STEP 6: Create the Auto Scaling Group (`discode-asg`)

The Auto Scaling Group provisions and scales EC2 instances across multiple Availability Zones.

1. Navigate to **EC2 -> Auto Scaling Groups -> Create Auto Scaling group**.
2. **Step 1: Choose launch template**:
   - **Auto Scaling group name**: `discode-asg`
   - **Launch template**: Select `discode-template` (Latest version).
   - Click **Next**.
3. **Step 2: Choose instance launch options**:
   - **VPC**: Select your VPC.
   - **Availability Zones and subnets**: Select `us-east-1a`, `us-east-1b`, `us-east-1c`.
   - Click **Next**.
4. **Step 3: Configure advanced options**:
   - **Load balancing**: Check **Attach to an existing load balancer**.
   - **Existing load balancer target groups**: Select `discode-tg`.
   - **Health checks**: Check **Turn on Elastic Load Balancing health checks** (`ELB`).
   - **Health check grace period**: `180` seconds (allows initial Docker build to finish).
   - Click **Next**.
5. **Step 4: Configure group size and scaling policies**:
   - **Desired capacity**: `2`
   - **Minimum capacity**: `2`
   - **Maximum capacity**: `6`
   - **Automatic scaling**: Select **Target tracking scaling policy**.
     - **Metric type**: `Average CPU utilization`.
     - **Target value**: `60`%.
   - Click **Next**.
6. Click through **Next** and click **Create Auto Scaling group**.

---

### STEP 7: Verify Health & Live Real-Time Collaboration

1. In the AWS Console, open **EC2 -> Target Groups -> `discode-tg` -> Targets**.
2. Within 2-3 minutes, both EC2 instances will transition from `Initial` to **`Healthy`** (HTTP 200 on `/healthz`).
3. Open your browser to the ALB DNS name:
   ```
   http://discode-alb-123456789.us-east-1.elb.amazonaws.com
   ```
4. **Test Real-Time Sync**:
   - Open Room link in Tab 1 and Tab 2.
   - Collaborator name flags, real-time Monaco synchronization, and presence count (`👥 2 Online`) will connect smoothly across both EC2 nodes via the ALB sticky cookie!

---

## 🔍 Troubleshooting & Operational Commands

### Check Live Container Logs on any EC2 Node:
```bash
ssh -i your-key.pem ubuntu@<EC2_IP>
cd /opt/discode
sudo docker compose logs -f backend
```

### Run Automated Unit & E2E Tests on the Node:
```bash
sudo docker exec discode-backend-1 npm test
```

### Force a Manual Container Stack Restart:
```bash
sudo docker compose restart backend
```

# 🏗️ Discode Jenkins CI/CD Deployment Guide on AWS
### Complete Step-by-Step Production Guide to Setup a Self-Hosted Jenkins Pipeline Deploying Discode to AWS EC2

This guide walks you through setting up a **self-hosted Jenkins CI/CD pipeline on AWS** to automatically test, build, deploy, and verify Discode on your target EC2 instance whenever new code is pushed to your Git repository.

---

## 📐 Architecture Overview

```
                      [ Developer git push (main) ]
                                    │
                                    ▼
                      ┌──────────────────────────┐
                      │    Git Repository        │
                      │    (GitHub / AWS Code)   │
                      └─────────────┬────────────┘
                                    │ (Webhook Trigger)
                                    ▼
                      ┌──────────────────────────┐
                      │    Jenkins Master Server │
                      │    (AWS EC2 Ubuntu Node) │
                      │    - Strict Typecheck    │
                      │    - Automated Jest Test │
                      │    - Docker Build & Tag  │
                      └─────────────┬────────────┘
                                    │ (SSH + SCP Deployment)
                                    ▼
                      ┌──────────────────────────┐
                      │  Target Discode EC2 Node │
                      │  - Docker Compose Stack  │
                      │  - Backend (Port 8080)   │
                      │  - MySQL Container       │
                      │  - Healthcheck (/healthz)│
                      └──────────────────────────┘
```

---

## 📋 Prerequisites
1. Two AWS EC2 Instances (Ubuntu 22.04 LTS):
   - **Server A (Jenkins Server)**: `t3.medium` (2 vCPU, 4 GiB RAM) for builds and tests.
   - **Server B (Target Discode Server)**: `t3.small` (2 vCPU, 2 GiB RAM) running Discode.
2. An SSH Key Pair (`.pem`) used to connect to your EC2 instances.

---

## 🛠️ Step-by-Step Setup Procedure

---

### STEP 1: Launch and Configure the Jenkins Server on EC2

1. In the AWS Console, open **EC2 -> Launch Instances**.
2. **Name**: `jenkins-master`.
3. **AMI**: `Ubuntu Server 22.04 LTS (HVM)`.
4. **Instance type**: `t3.medium` (2 vCPU, 4 GiB RAM).
5. **Security Group**:
   - **Port 22 (SSH)**: From `My IP`.
   - **Port 8080 (Jenkins UI)**: From `0.0.0.0/0` (or your office IP).
6. **Storage**: `30 GiB` GP3 SSD.
7. Click **Launch Instance**.

---

### STEP 2: Install Java, Jenkins & Docker on Jenkins Server

SSH into the Jenkins server:

```bash
ssh -i your-key.pem ubuntu@<JENKINS_SERVER_PUBLIC_IP>
```

Run the following commands to install OpenJDK 17, Jenkins, and Docker:

```bash
# 1. Update system packages
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git openjdk-17-jdk

# 2. Add Jenkins Repository and Install Jenkins
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y jenkins

# 3. Install Docker Engine
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 4. Grant Jenkins user permission to run Docker and sudo commands
sudo usermod -aG docker jenkins
sudo usermod -aG docker ubuntu
sudo systemctl restart docker
sudo systemctl enable jenkins
sudo systemctl restart jenkins

# 5. Retrieve Initial Admin Password
echo "=================================================================="
echo "🔑 YOUR INITIAL JENKINS ADMIN PASSWORD:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
echo "=================================================================="
```

---

### STEP 3: Initial Jenkins Web UI Configuration

1. Open your browser and navigate to:
   ```
   http://<JENKINS_SERVER_PUBLIC_IP>:8080
   ```
2. Paste the **Initial Admin Password** from Step 2.
3. Click **Install suggested plugins**.
4. Create your Admin user (Username, Password, Full Name, Email).
5. Once inside Jenkins dashboard, go to **Manage Jenkins -> Plugins -> Available Plugins** and install:
   - **SSH Agent Plugin** (`ssh-agent`)
   - **Pipeline: Stage View Plugin**
   - **AnsiColor Plugin** (For colorized terminal output)
6. Click **Install without restart**.

---

### STEP 4: Configure Jenkins Credentials

Jenkins needs credentials to SSH into your Target Discode EC2 instance.

1. In Jenkins, navigate to **Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials**.
2. **Add SSH Private Key**:
   - **Kind**: `SSH Username with private key`
   - **ID**: `discode-ec2-ssh-key`
   - **Username**: `ubuntu`
   - **Private Key**: Select **Enter directly** and paste the contents of your `.pem` key file.
   - Click **Create**.
3. **Add Target Server IP Secret**:
   - Click **Add Credentials**.
   - **Kind**: `Secret text`
   - **ID**: `DISCODE_EC2_HOST`
   - **Secret**: `<TARGET_DISCODE_EC2_PUBLIC_IP>` (e.g. `54.210.12.34`)
   - Click **Create**.
4. **(Optional) Add Docker Hub / ECR Username**:
   - **Kind**: `Secret text`
   - **ID**: `DOCKER_HUB_USER`
   - **Secret**: `your-dockerhub-username`
   - Click **Create**.

---

### STEP 5: Create the Discode Pipeline Job

1. On the Jenkins home screen, click **New Item**.
2. **Item name**: `discode-pipeline`.
3. Select **Pipeline** and click **OK**.
4. Scroll down to the **Pipeline** section:
   - **Definition**: Select **Pipeline script from SCM**.
   - **SCM**: Select **Git**.
   - **Repository URL**: `https://github.com/dilip98914/discode.git` (or your private Git repository URL).
   - **Credentials**: Select your Git credentials if private repository.
   - **Branch Specifier**: `*/main` (or `*/master`).
   - **Script Path**: `Jenkinsfile`.
5. Click **Save**.

---

### STEP 6: Run Pipeline & Verify

1. Click **Build Now** on the left sidebar.
2. Watch the pipeline execute through the 5 automated stages:
   - **📥 1. Checkout Code**: Clones the latest commit.
   - **🛡️ 2. Typecheck & Automated Test Suite**: Runs strict TypeScript check (`tsc --noEmit`) and Jest tests (15/15 tests across Python, JS, Java, Go, C, C++, Room CRUD, and Sockets).
   - **📦 3. Build Docker Image**: Compiles backend, Monaco frontend, and runtime sandboxes into a production image.
   - **🚀 4. Deploy to Target EC2**: Securely transfers project bundle to target EC2 over SSH and runs `docker compose up --build -d`.
   - **🩺 5. Health Check Verification**: Automatically queries `http://<TARGET_EC2_IP>:8080/healthz` to confirm the service is live and ready before declaring success!

---

### STEP 7: Configure Auto-Deploy Webhook on Git Push

To make Jenkins automatically build and deploy every time you push code to GitHub:

1. In Jenkins, go to `discode-pipeline` -> **Configure** -> **Build Triggers**.
2. Check **GitHub hook trigger for GITScm polling** -> Click **Save**.
3. In your **GitHub Repository**, go to **Settings -> Webhooks -> Add webhook**:
   - **Payload URL**: `http://<JENKINS_SERVER_PUBLIC_IP>:8080/github-webhook/`
   - **Content type**: `application/json`
   - **Which events would you like to trigger this webhook?**: `Just the push event`.
   - Click **Add webhook**.

Whenever you commit and push changes, Jenkins will automatically test and deploy your code to AWS EC2!

---

## 🔍 Troubleshooting & Operational Commands

### Check Jenkins Pipeline Logs:
In the Jenkins UI, click the active build number -> **Console Output**.

### Check Target Server Application Logs:
```bash
ssh -i your-key.pem ubuntu@<TARGET_EC2_IP>
cd /opt/discode
sudo docker compose logs -f backend
```

### Run Tests Manually on Target Server:
```bash
sudo docker exec discode-backend-1 npm test
```

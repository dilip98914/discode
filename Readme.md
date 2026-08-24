# Discode 🚀
> Production-Grade Real-Time Collaborative IDE with Monaco (VS Code Engine), Zero-Collision Real-Time Sync, Visible Multi-Cursor Name Flags, Live Presence, 6-Language Local Sandbox Runner, Strictly Sequential 30-Day Audit History, Self-Hosted WebRTC Voice, and Complete AWS Deployment Guides.

Discode empowers engineering teams, students, and interviewers to code together in real time with the power of the **Monaco Editor (VS Code engine)**, multi-file project workspaces, colored collaborative cursors with name flags, live voice channels, local sandbox execution across **6 programming languages**, and complete 30-day code attribution traceability.

---

## 📑 Table of Contents
1. [Quick Start (Local Docker)](#-quick-start-local-docker)
2. [Step-by-Step: Single EC2 Deployment (Mobile & Web Testing)](#-step-by-step-single-ec2-deployment-mobile--web-testing)
3. [Step-by-Step: Production AWS ALB + EC2 Auto Scaling Group (ASG)](#-step-by-step-production-aws-alb--ec2-auto-scaling-group-asg)
4. [Architecture & Zero-Collision Real-Time Engine](#-architecture--zero-collision-real-time-engine)
5. [Language Sandbox Runtimes (6 Languages)](#-language-sandbox-runtimes-6-languages)
6. [Visible Multi-Cursor Flags & Live Presence](#-visible-multi-cursor-flags--live-presence)
7. [Multi-File Workspace & Export](#-multi-file-workspace--export)
8. [Strictly Sequential 30-Day Code History](#-strictly-sequential-30-day-code-history)
9. [WebRTC Voice Rooms](#-webrtc-voice-rooms)
10. [Automated Jest Test Suite (15/15 Passed)](#-automated-jest-test-suite-1515-passed)

---

## 💻 Quick Start (Local Docker)

To run Discode locally on your machine:

```bash
docker compose up --build -d
```

Open **`http://localhost:8080`** in your browser.

---

## 📱 Step-by-Step: Single EC2 Deployment (Mobile & Web Testing)

Deploy Discode on a single Ubuntu EC2 instance in **under 3 minutes** for direct testing on mobile phones, tablets, and remote PCs:

### Step 1: Launch EC2 Instance in AWS Console
1. Navigate to **AWS Console -> EC2 -> Launch Instances**.
2. **Name**: `discode-single-node`.
3. **AMI**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type`.
4. **Instance Type**: `t3.small` (2 vCPU, 2 GiB RAM) or `t3.medium`.
5. **Key Pair**: Select or create an SSH key pair (`.pem`).
6. **Network Settings (Security Group)**:
   - Allow **SSH (Port 22)** from `My IP` or `0.0.0.0/0`.
   - Allow **Custom TCP (Port 8080)** from `0.0.0.0/0`.
   - Allow **HTTP (Port 80)** & **HTTPS (Port 443)** from `0.0.0.0/0`.
7. Click **Launch Instance**.

### Step 2: SSH and Run 1-Command Bootstrap
Connect via SSH to your instance and run:
```bash
curl -fsSL https://raw.githubusercontent.com/dilip98914/discode/main/scripts/ec2-setup.sh | bash
```
*(The script automatically installs Docker, Docker Compose, clones the codebase, and starts the container stack with automatic reboot recovery)*.

### Step 3: Access Discode
Open your browser on any phone or PC:
```
http://<YOUR_EC2_PUBLIC_IP>:8080
```

---

## 🌐 Step-by-Step: Production AWS ALB + EC2 Auto Scaling Group (ASG)

For high-availability, auto-scaling production workloads across multiple Availability Zones:

```
                      [ Incoming User Traffic (Mobile / Web) ]
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    Application Load Balancer (ALB)   │
                      │    - Port 80 / 443                   │
                      │    - Session Stickiness (lb_cookie)  │
                      │    - Health Probe: /healthz          │
                      └──────────────────┬───────────────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
             ┌─────────────────────┐           ┌─────────────────────┐
             │ EC2 Instance A (AZ1)│           │ EC2 Instance B (AZ2)│
             │ Discode Container   │           │ Discode Container   │
             └──────────┬──────────┘           └──────────┬──────────┘
                        │                                 │
                        └────────────────┬────────────────┘
                                         ▼
                                ┌─────────────────┐
                                │ AWS RDS MySQL 8 │
                                │ (Multi-AZ DB)   │
                                └─────────────────┘
```

### Step 1: Create Target Group (ALB Target Group)
1. In EC2 Console, go to **Target Groups -> Create target group**.
2. **Target type**: `Instances`.
3. **Target group name**: `discode-tg`.
4. **Protocol / Port**: `HTTP` on port `8080`.
5. **Health checks**:
   - **Health check protocol**: `HTTP`
   - **Health check path**: `/healthz`
   - **Healthy threshold**: `2`, **Interval**: `15` seconds.
6. **Attributes (Crucial for WebSocket Stickiness)**:
   - Click **Edit Group Attributes**.
   - Enable **Stickiness**: Type `Load balancer generated cookie` (`lb_cookie`).
   - Duration: `86400` seconds (1 day).

### Step 2: Create Launch Template
1. Go to **EC2 -> Launch Templates -> Create launch template**.
2. **Template Name**: `discode-template`.
3. **AMI**: `Ubuntu Server 22.04 LTS`.
4. **Instance Type**: `t3.small` or `t3.medium`.
5. **Security Group**: Allow Port 8080 from ALB Security Group and Port 22 for administration.
6. **Advanced details -> User data**:
```bash
#!/bin/bash
curl -fsSL https://raw.githubusercontent.com/dilip98914/discode/main/scripts/ec2-setup.sh | bash
```

### Step 3: Create Auto Scaling Group (ASG)
1. Go to **EC2 -> Auto Scaling Groups -> Create Auto Scaling Group**.
2. **Name**: `discode-asg`.
3. **Launch Template**: Select `discode-template`.
4. **VPC & Subnets**: Select at least 2 public/private subnets across multiple AZs.
5. **Load balancing**: Attach to existing target group -> select `discode-tg`.
6. **Health checks**: Turn on `ELB` health checks.
7. **Group size**:
   - **Desired capacity**: `2`
   - **Minimum capacity**: `2`
   - **Maximum capacity**: `6`
8. **Scaling policies**: Target tracking scaling policy -> CPU Utilization `60%`.

### Step 4: Create Application Load Balancer (ALB)
1. Go to **EC2 -> Load Balancers -> Create Application Load Balancer**.
2. **Name**: `discode-alb`.
3. **Scheme**: `Internet-facing`.
4. **Listeners**:
   - `HTTP` port 80 -> Forward to `discode-tg`.
   - `HTTPS` port 443 (with ACM SSL certificate) -> Forward to `discode-tg`.
5. Point your domain DNS (e.g. `code.yourdomain.com`) to the ALB DNS Name via CNAME or Route 53 Alias.

---

## 🏗 Architecture & Zero-Collision Real-Time Engine

### ⚡ Zero-Collision Real-Time Typing
Standard Monaco implementations re-render the model on every state update, resetting the cursor to line 1 and overriding simultaneous peer edits.

Discode solves this using **Uncontrolled Model Synchronization with Cursor & Scroll Preservation**:
1. When a user types locally, edits emit to peers without re-triggering `editor.setValue()`.
2. When remote socket events arrive (`updateBody`, `files:synced`), Discode inspects `editor.getValue() !== value`, captures the user's cursor position (`editor.getPosition()`) and scroll top (`editor.getScrollTop()`), updates the model, and immediately restores the cursor.
3. Multiple users can type simultaneously on different lines or files without any cursor jumping or text loss.

---

## ⚡ Language Sandbox Runtimes (6 Languages)

All code execution is 100% self-hosted inside isolated temporary sandboxes with strict 7-second timeouts and output buffer caps:

| Language | Engine / Compiler | Execution Method | Multi-File Support |
| :--- | :--- | :--- | :--- |
| **Python** | Python 3.9 | `python3 main.py` | ✅ Yes (e.g. `import helper`) |
| **JavaScript** | Node.js 18 | `node main.js` | ✅ Yes (e.g. `require('./utils')`) |
| **Java** | OpenJDK 11 | `javac Main.java` && `java -cp . Main` | ✅ Yes (Multiple classes) |
| **Go** | Golang 1.15 | `go run main.go` | ✅ Yes (Multi-file packages) |
| **C** | GCC 10 (`-O2`) | `gcc -O2 main.c -o main.out` && `./main.out` | ✅ Yes (Header linking) |
| **C++** | G++ 10 (`-O2`) | `g++ -O2 main.cpp -o main.out` && `./main.out` | ✅ Yes (Header linking) |

---

## 👥 Visible Multi-Cursor Flags & Live Presence

- **Floating Collaborator Name Tags**: Every remote user has a distinct colored vertical bar (`.remote-cursor-line`) with a floating name tag (`.remote-cursor-flag`, e.g. `Alice`, `Bob`) positioned above their cursor.
- **Live Presence Roster**: Active participant count badge (`👥 2 Online`) and avatar chips with real-time join/disconnect tracking.
- **Independent Tab Browsing**: Collaborators can switch file tabs independently without forcing their peer's tab to switch.

---

## 📁 Multi-File Workspace & Export

- **File Tree & Tabs**: Add (`+ New File`), switch, and delete multiple files in a single room (e.g., `main.py`, `helper.py`).
- **One-Click Export**:
  - **Download ZIP**: Generates a `.zip` archive containing all project files.
  - **Copy Markdown / Gist**: Formats all files into Markdown code blocks ready for GitHub Gists.

---

## 📜 Strictly Sequential 30-Day Code History

- Every code run and save is audited with author attribution and timestamped in MySQL.
- Sorted by `ORDER BY id DESC, created_at DESC` guaranteeing **monotonic sequential chronology** (most recent snapshots first).
- Auto-expires after 30 days via scheduled cleanup daemon.

---

## 🎙️ WebRTC Voice Rooms

- Self-hosted peer-to-peer audio mesh powered by the embedded `/peerjs` signaling server on the same port (8080).
- Visual speaking indicator with green pulse animation when collaborators talk.
- Microphone stream cleanup on leave to ensure microphone hardware releases cleanly.

---

## 🧪 Automated Jest Test Suite (15/15 Passed)

```bash
# Run the complete test suite inside the container:
docker exec discode-backend-1 npm test
```

### Verified Test Results:
```
PASS tests/api.test.ts
  🏥 Health & Diagnostic Endpoints
    ✓ GET /healthz should return 200 with healthy status
    ✓ GET /readyz should return 200 and report active database connection
  🏠 Room Lifecycle & Strict Sequential History
    ✓ POST /api/room should create a valid new room
    ✓ GET /api/room/:id should fetch the created room metadata
    ✓ PATCH /api/room/:id should update code and record audit snapshots in sequential order

PASS tests/runner.test.ts
  ⚡ Multi-Language Sandbox Runner Suite
    ✓ 🐍 Python 3: Should execute code correctly
    ✓ 📜 JavaScript (Node.js): Should execute code with stdin input
    ✓ ☕ Java (OpenJDK): Should compile with javac and execute with java
    ✓ 🐹 Go (Golang): Should execute with go run and isolated build cache
    ✓ ⚙️ C (GCC): Should compile with gcc -O2 and execute binary
    ✓ ⚡ C++ (G++): Should compile with g++ -O2 and execute binary
    ✓ 📁 Multi-File Execution: Should link multiple source files and modules

PASS tests/socket.test.ts
  🌐 Socket.IO Real-Time Synchronization & Multi-Cursor Suite
    ✓ 👥 Presence Roster: Should track and broadcast active users in a room
    ✓ ✏️ Real-Time Code Sync: Should broadcast code changes to room peers
    ✓ 📍 Multi-Cursor Movement: Should broadcast peer cursor positions and selection

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

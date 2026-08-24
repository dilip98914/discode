# Discode 🚀
> Real-Time Collaborative IDE with Multi-Language Remote Code Execution & WebRTC Voice Rooms.

Discode allows developers to create shared coding rooms, write and edit code collaboratively with real-time text synchronization, execute code across 8+ programming languages, and communicate directly over peer-to-peer audio.

---

## 📑 Table of Contents
1. [Tech Stack & 3rd-Party Dependencies](#-tech-stack--3rd-party-dependencies)
2. [System Architecture](#-system-architecture)
3. [Quickstart (Local & Docker)](#-quickstart-local--docker)
4. [Testing Guide & cURL Test Suite](#-testing-guide--curl-test-suite)
5. [Production Deployment](#-production-deployment)
6. [Cloud Architecture: AWS ECS vs AWS Lambda](#-cloud-architecture-aws-ecs-vs-aws-lambda)

---

## 🛠 Tech Stack & 3rd-Party Dependencies

### Core Stack
- **Frontend**: React 17, TypeScript, Ace Editor (`react-ace`), PeerJS (WebRTC audio), `diff-match-patch`, Socket.IO Client, Bootstrap 5.
- **Backend**: Node.js, Express, TypeScript, Socket.IO Server, `mysql` connection pool.
- **Database**: MySQL 8.0 with [dbmate](https://github.com/amacneil/dbmate) automated migrations.

### 3rd-Party External Services & Endpoints
| Service | External Endpoint | Purpose |
| :--- | :--- | :--- |
| **Paiza.io Runner API** | `https://api.paiza.io/runners/*` | Multi-language sandbox code execution engine (proxied server-to-server via `/api/runner/*` to eliminate browser CORS issues). |
| **PeerJS Cloud Signaling** | `0.peerjs.com` / PeerJS Cloud | WebRTC STUN/Signaling broker for peer-to-peer audio stream handshakes. |
| **Bootstrap CDN** | `cdn.jsdelivr.net` | UI styling and layout responsive framework. |

---

## 🏗 System Architecture

```
                                [ Browser Clients (A & B) ]
                                  │          │          │
                     (HTTP REST)  │          │          │ (WebRTC Audio Mesh)
                                  ▼          │          ▼
                        ┌─────────────────┐  │  ┌─────────────────┐
                        │ Express Backend │  │  │ Peer Client B   │
                        │ & Runner Proxy  │  │  └─────────────────┘
                        └────────┬────────┘  │          ▲
                                 │           │          │
                 (Node HTTPS)    │           │ (WebSocket / Socket.IO)
                                 ▼           ▼
                      ┌────────────────────────────┐
                      │    Discode Node Server     │
                      │ (Rooms API + Socket.IO)    │
                      └───────┬────────────┬───────┘
                              │            │
             (SQL Connection) │            │ (Server-to-Server)
                              ▼            ▼
                     ┌─────────────┐  ┌───────────────────────┐
                     │ MySQL 8 DB  │  │ Paiza.io Runner API   │
                     │ (Rooms Meta)│  │ (Remote Sandbox Exec) │
                     └─────────────┘  └───────────────────────┘
```

---

## 🔄 Real-Time Synchronization: Root Cause & Architecture Solution

### Why Naive `diff-match-patch` Caused Character Loss
1. **Asymmetrical State Closures**: In React, typing rapidly creates patch deltas against stale closures of component state.
2. **Patch Application Rejection**: When multiple keystrokes arrive out-of-order or mid-render, `dmp.patch_apply(patch, text)` fails fuzzy matching and drops the entire edit (`res[0] === false`).
3. **Overlapping Overwrite**: Debounced patches generated against outdated text snapshots corrupt remote text upon application.

### The Fix: Atomic Document Synchronization
- **Zero-Drop State Broadcast**: Keystrokes update local state with 0-latency and emit atomic document updates via Socket.IO.
- **Debounced Network Transport**: Emits are throttled at 30ms to prevent socket flooding while ensuring every character is delivered.
- **Production Scalability Roadmap**: For production-grade multi-cursor concurrent editing across 100+ simultaneous typists, upgrade to **CRDTs (Yjs + y-webrtc / y-websocket)** or **Operational Transformation (ShareDB)**.

---

## 🚀 Quickstart (Local & Docker)

### Option 1: Docker Compose (Recommended)
Everything (MySQL 8, DB migrations, Backend API, and Frontend build) is automated in containers:

```bash
# 1. Clone the repository and navigate into it
git clone <repo-url>
cd discode

# 2. Copy the environment configuration
cp .env.production .env

# 3. Start containers with automatic migrations
docker compose up --build -d
```
Access the application at **`http://localhost:8080`**.

---

### Option 2: Local Development Setup

#### 1. Setup MySQL Database
Create a database named `discode` in your MySQL server. Update `.env` with your DB credentials:
```env
PORT=8080
DATABASE_URL=mysql://root:password@localhost:3306/discode
DATABASE_USER=root
DATABASE_PASSWORD=password
DATABASE_NAME=discode
DATABASE_HOST=localhost
DATABASE_PORT=3306
MAX_DB_CONN=50
NODE_ENV=development
```

Run migrations using `dbmate`:
```bash
dbmate migrate
```

#### 2. Start Backend Server
```bash
npm install
npm run dev
# Backend starts on http://localhost:8080
```

#### 3. Start Frontend Development Server
```bash
cd frontend
npm install
npm start
# Frontend starts on http://localhost:3000
```

---

## 🧪 Testing Guide & cURL Test Suite

### 1. Verify Frontend Health
```bash
curl -i http://localhost:8080/
```
*Expected*: `HTTP/1.1 200 OK` with HTML content.

---

### 2. Room REST APIs (CRUD)

#### Create a Room (`POST /api/room`)
```bash
curl -X POST http://localhost:8080/api/room \
  -H "Content-Type: application/json" \
  -d '{"title":"Algorithm Test","body":"console.log(\"Hello Discode!\");","language":"javascript","input":""}'
```
*Response*:
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "title": "Algorithm Test",
    "body": "console.log(\"Hello Discode!\");",
    "language": "javascript",
    "input": "",
    "id": "e2f1837c-fbc3-48df-8924-a74cb549e5d1"
  }
}
```

#### Fetch Room by ID (`GET /api/room/:id`)
```bash
curl -X GET http://localhost:8080/api/room/<ROOM_ID>
```

#### Update Room Code / Language (`PATCH /api/room/:id`)
```bash
curl -X PATCH http://localhost:8080/api/room/<ROOM_ID> \
  -H "Content-Type: application/json" \
  -d '{"title":"Algorithm Test","body":"def solve(): return 42","language":"python","input":""}'
```

---

### 3. Remote Code Runner Proxy APIs

#### Submit Code Job (`POST /api/runner/create`)
```bash
curl -X POST http://localhost:8080/api/runner/create \
  -H "Content-Type: application/json" \
  -d '{"source_code":"print(10 + 20)","language":"python","input":""}'
```
*Response*: `{"id": "7ebc356f-c9cb-41a9-b546-785f4b16daf5", "status": "running"}`

#### Poll Execution Status (`GET /api/runner/status`)
```bash
curl -X GET "http://localhost:8080/api/runner/status?id=<JOB_ID>"
```
*Response*: `{"id": "...", "status": "completed"}`

#### Fetch Execution Output & Errors (`GET /api/runner/details`)
```bash
curl -X GET "http://localhost:8080/api/runner/details?id=<JOB_ID>"
```
*Response*: `{"id": "...", "stdout": "30", "stderr": "", "build_stderr": ""}`

---

### 4. Real-Time Socket.IO Synchronization Test
To test real-time synchronization between two connected users without a browser, run:
```bash
docker exec -e NODE_PATH=/usr/src/discode/frontend/node_modules discode-backend-1 node -e "
const io = require('socket.io-client');
const client1 = io('http://localhost:8080');
const client2 = io('http://localhost:8080');
const roomId = 'test-room-123';

client1.on('connect', () => {
  client1.emit('joinroom', roomId);
});

client2.on('connect', () => {
  client2.emit('joinroom', roomId);
  client2.on('updateBody', (patch) => {
    console.log('[PASS] Client 2 received code update:', patch);
    client1.disconnect();
    client2.disconnect();
    process.exit(0);
  });
  setTimeout(() => {
    client1.emit('updateBody', { value: 'console.log(999);', roomId });
  }, 300);
});
"
```

---

### 5. WebRTC Voice Room Signaling Test
To verify that voice room peer exchange functions correctly over Socket.IO:
```bash
docker exec -e NODE_PATH=/usr/src/discode/frontend/node_modules discode-backend-1 node -e "
const io = require('socket.io-client');
const client1 = io('http://localhost:8080');
const client2 = io('http://localhost:8080');
const roomId = 'voice-room-456';

client1.on('connect', () => client1.emit('joinroom', roomId));
client2.on('connect', () => {
  client2.emit('joinroom', roomId);
  client2.on('userJoinedAudio', (peerId) => {
    console.log('[PASS] Client 2 received userJoinedAudio signal for Peer:', peerId);
    client1.disconnect();
    client2.disconnect();
    process.exit(0);
  });
  setTimeout(() => client1.emit('joinAudioRoom', roomId, 'peer-user-777'), 300);
});
"
```

---

## 🚢 Production Deployment

### Docker Deployment on Virtual Machines (EC2 / DigitalOcean / Linode / Azure VM)
1. Provision an Ubuntu 22.04+ VM.
2. Install Docker & Docker Compose.
3. Clone repository and run:
   ```bash
   cp .env.production .env
   docker compose up --build -d
   ```
4. Place Nginx or Caddy in front with SSL (Certbot Let's Encrypt) to enable `HTTPS` and `WSS`.
   > **Note**: Modern browsers block microphone/audio access (`getUserMedia`) on insecure `HTTP` origins outside of `localhost`. **HTTPS is mandatory for voice rooms.**

---

## ☁️ Cloud Architecture: AWS ECS vs AWS Lambda

When deploying Discode for multi-device internet access, choosing between **AWS ECS (Fargate)** and **AWS Lambda** is a critical architectural decision.

### Architectural Comparison

| Dimension | AWS ECS (Fargate) (Recommended) 🌟 | AWS Serverless (Lambda + API Gateway) ⚠️ |
| :--- | :--- | :--- |
| **WebSocket / Socket.IO Compatibility** | **Native**. Socket.IO maintains long-lived TCP connections, heartbeats, and room state. | **Complex**. API Gateway WebSockets does not support Socket.IO protocol out of the box (requires raw WebSockets or custom adapter). |
| **Stateful Signaling & Rooms** | Easy with Redis Pub/Sub (`@socket.io/redis-adapter`). | High database overhead: every message requires DynamoDB lookups for connection IDs. |
| **Execution Limits** | Long-running containers, zero request duration timeout. | 15-minute hard timeout per invocation. |
| **WebRTC Media Support** | Can run self-hosted SFU (LiveKit / Mediasoup) alongside backend. | Impossible to run Media/RTP servers on Lambda. |
| **Cold Starts** | Zero cold starts once containers are warm. | Cold starts can degrade real-time responsiveness. |

---

### Recommended Production Cloud Architecture (AWS ECS Fargate)

```
                            [ Route 53 + ACM (SSL) ]
                                       │
                         [ Application Load Balancer ]
                        (Sticky Sessions + WSS Upgrade)
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
           [ ECS Task 1 (Fargate) ]          [ ECS Task 2 (Fargate) ]
           Node.js + Express + Socket.IO     Node.js + Express + Socket.IO
                      │                                 │
                      └────────────────┬────────────────┘
                                       ▼
                       [ AWS ElastiCache for Redis ]
                         (Socket.IO Pub/Sub Mesh)
                                       │
                                       ▼
                         [ AWS RDS Aurora (MySQL) ]
                            (Persistent Storage)
```

### Steps to Deploy on AWS ECS (Fargate)
1. **Push Container to ECR**:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_URL>
   docker build -t discode-backend .
   docker tag discode-backend:latest <ECR_URL>/discode:latest
   docker push <ECR_URL>/discode:latest
   ```
2. **Database & Cache**:
   - Launch an **Amazon RDS MySQL** instance.
   - Launch an **Amazon ElastiCache Redis** cluster for horizontal multi-node socket sync.
3. **ECS Task Definition**:
   - Configure CPU (`0.5 vCPU`) and Memory (`1 GB RAM`).
   - Add environment variables (`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `PORT=8080`, `NODE_ENV=production`).
4. **Application Load Balancer (ALB)**:
   - Route `HTTP:80` and `HTTPS:443` traffic to ECS Target Group.
   - Enable **Stickiness** on the Target Group (required for Socket.IO HTTP long-polling handshake before upgrading to WebSocket).
   - Attach an SSL certificate via **AWS Certificate Manager (ACM)** for HTTPS/WSS (mandatory for WebRTC audio).

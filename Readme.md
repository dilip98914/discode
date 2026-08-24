# Discode 🚀
> 100% Self-Hosted Real-Time Collaborative IDE with Local Multi-Language Sandbox Runner, Embedded WebRTC Voice Signaling & 30-Day Code Attribution Audit History.

Discode allows developers to create shared coding rooms, write and edit code collaboratively with real-time text synchronization, execute code locally across multiple programming languages, and communicate directly over self-hosted peer-to-peer audio with 30-day code attribution and history logs.

---

## 📑 Table of Contents
1. [Core Concepts: Library vs Running Server](#-core-concepts-library-vs-running-server)
2. [100% Self-Hosted Architecture (Zero Cloud Dependencies)](#-100-self-hosted-architecture)
3. [Features & 30-Day Audit History](#-features--30-day-audit-history)
4. [Quickstart (Local & Docker)](#-quickstart-local--docker)
5. [Testing Guide & cURL Test Suite](#-testing-guide--curl-test-suite)
6. [Cloud Architecture: AWS ECS vs AWS Lambda](#-cloud-architecture-aws-ecs-vs-aws-lambda)

---

## 💡 Core Concepts: Library vs. Running Server

Understanding the difference between an npm library and a running service is a fundamental Senior Engineering concept:

| Category | Definition | Examples in Discode | Execution Lifecycle |
| :--- | :--- | :--- | :--- |
| **Client-Side Code Library** | Pure client-side UI/algorithm code bundled into the browser bundle (via Webpack). It does **NOT** run a server process. | `react-ace`, `diff-match-patch`, `socket.io-client`, `bootstrap` | Executes entirely inside the user's browser CPU/memory. |
| **Server-Side Node Package (Library Mode)** | Reusable JavaScript/TypeScript helper utilities running inside the Node.js process. | `cors`, `uuidv4`, `dotenv` | Executes synchronously or asynchronously within the Express backend thread. |
| **Running Service / Daemon** | A stateful, long-lived background server process listening on TCP/UDP network ports for connections and routing packets. | **Express HTTP API** (`:8080`), **Socket.IO Engine**, **Embedded PeerServer** (`/peerjs`), **MySQL 8** (`:3306`) | Runs continuously in OS background, binds network sockets, and handles incoming concurrent client requests. |

> **Note on PeerJS & WebRTC**: The npm package `peerjs` is a *client library* used to open browser media streams. However, WebRTC requires a *Signaling Server (PeerServer)* to exchange SDP offers and ICE candidates. Discode previously relied on the public cloud server `0.peerjs.com`, but now runs a **100% self-hosted, embedded PeerServer** on `/peerjs`.

---

## 🏗 100% Self-Hosted Architecture

```
                                [ Browser Clients (Alice & Bob) ]
                                  │          │          │
                     (HTTP REST)  │          │          │ (Self-Hosted WebRTC Mesh)
                                  ▼          │          ▼
                        ┌─────────────────┐  │  ┌─────────────────┐
                        │ Express Backend │  │  │ Peer Client Bob │
                        │  & Local Runner │  │  └─────────────────┘
                        └────────┬────────┘  │          ▲
                                 │           │          │
                     (Local IPC) │           │ (WebSocket / Socket.IO & /peerjs)
                                 ▼           ▼
                      ┌─────────────────────────────────────────┐
                      │           Discode Node Server           │
                      │  - Rooms REST API                       │
                      │  - Socket.IO Real-Time Sync             │
                      │  - Embedded PeerServer (/peerjs)        │
                      │  - Local Sandbox Runner (Python, C, CPP)│
                      │  - 30-Day TTL Cleanup Daemon            │
                      └──────────────────┬──────────────────────┘
                                         │
                        (SQL Connection) │
                                         ▼
                                ┌─────────────────┐
                                │   MySQL 8 DB    │
                                │  - Rooms Meta   │
                                │  - Code History │
                                └─────────────────┘
```

---

## 🔒 Features & 30-Day Audit History

1. **100% Local Multi-Language Execution**:
   - Compiles and executes code directly inside the backend container using `python3`, `node`, `gcc`, and `g++`.
   - Zero dependency on 3rd-party remote runner APIs (`api.paiza.io`).
   - Strict 7-second timeout protection and process isolation to prevent infinite loops (`while(true)`).
2. **Self-Hosted WebRTC Voice Rooms**:
   - Uses embedded `ExpressPeerServer` mounted at `/peerjs` for local signaling without external cloud servers.
3. **Non-Authenticated User Attribution**:
   - Users can set a display handle/name (e.g. `Alice`, `Bob`) upon creating or joining a room.
4. **30-Day Retention & Audit History**:
   - Every code save and run is recorded in the `code_history` table with author attribution, action (`create`, `save`, `run`), and snapshot.
   - Database entries automatically store `expires_at = CURRENT_TIMESTAMP + INTERVAL 30 DAY`.
   - A daily backend cleanup daemon automatically sweeps and purges expired rooms and historical records.
   - Users can click **📜 History** in the UI to inspect past snapshots and restore any previous version.

---

## 🚀 Quickstart (Docker Compose)

```bash
# 1. Start all containers (MySQL + Backend + Local PeerServer + Local Runner)
docker compose up --build -d
```
Access the application at **`http://localhost:8080`**.

---

## 🧪 Testing Guide & cURL Test Suite

### 1. Test Local Sandbox Code Execution
#### Execute Python Code Locally
```bash
curl -X POST http://localhost:8080/api/runner/create \
  -H "Content-Type: application/json" \
  -d '{"source_code":"print(\"Hello from Local Runner!\")","language":"python","input":""}'
```
#### Fetch Execution Output
```bash
curl -X GET "http://localhost:8080/api/runner/details?id=<JOB_ID>"
```
*Expected*: `{"status":"completed","stdout":"Hello from Local Runner!\n"}`

---

### 2. Test Self-Hosted PeerServer
```bash
curl -s http://localhost:8080/peerjs/peerjs/id
```
*Expected*: Generates a unique WebRTC peer UUID (e.g., `207f29bd-6222-4b57-9193-bcab1ae4f49f`).

---

### 3. Test Room Creation with Author & 30-Day Audit Log
#### Create Room with Author Handle
```bash
curl -X POST http://localhost:8080/api/room \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Review","body":"def main(): pass","language":"python","author_name":"Alice_Lead"}'
```

#### Update Code as Another Author
```bash
curl -X PATCH http://localhost:8080/api/room/<ROOM_ID> \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Review","body":"def main(): print(\"Updated by Bob\")","language":"python","author_name":"Bob_Reviewer"}'
```

#### Fetch 30-Day Audit Trail
```bash
curl -X GET http://localhost:8080/api/room/<ROOM_ID>/history
```
*Response*:
```json
{
  "success": true,
  "message": "Room history fetched successfully",
  "data": [
    {
      "id": 2,
      "room_id": "33d3e491-a654-409e-b088-a0b477bcec57",
      "author_name": "Bob_Reviewer",
      "code_snapshot": "def main(): print(\"Updated by Bob\")",
      "action": "save",
      "created_at": "2026-08-24T16:26:12.000Z",
      "expires_at": "2026-09-23T16:26:12.000Z"
    },
    {
      "id": 1,
      "room_id": "33d3e491-a654-409e-b088-a0b477bcec57",
      "author_name": "Alice_Lead",
      "code_snapshot": "def main(): pass",
      "action": "create",
      "created_at": "2026-08-24T16:26:10.000Z",
      "expires_at": "2026-09-23T16:26:10.000Z"
    }
  ]
}
```

---

## ☁️ Cloud Architecture: AWS ECS vs AWS Lambda

### Recommended Production Architecture (AWS ECS Fargate)
- **ECS Fargate**: Runs the unified container (Express + Socket.IO + Embedded PeerServer + Local Runner).
- **Application Load Balancer (ALB)**: HTTPS (ACM Certificate) + Stickiness for Socket.IO polling upgrade.
- **ElastiCache Redis**: Multi-node Socket.IO cluster broadcast.
- **Amazon RDS MySQL**: Long-term database storage with automated 30-day snapshot cleanup.

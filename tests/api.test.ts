import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

describe('🏥 Health & Diagnostic Endpoints', () => {
    it('GET /healthz should return 200 with healthy status', async () => {
        const res = await axios.get(`${BASE_URL}/healthz`);
        expect(res.status).toBe(200);
        expect(res.data.data.status).toBe('healthy');
        expect(res.data.data.uptime).toBeGreaterThanOrEqual(0);
    });

    it('GET /readyz should return 200 and report active database connection', async () => {
        const res = await axios.get(`${BASE_URL}/readyz`);
        expect(res.status).toBe(200);
        expect(res.data.data.status).toBe('ready');
        expect(res.data.data.memoryUsageMb).toBeGreaterThan(0);
    });
});

describe('🏠 Room Lifecycle & Strict Sequential History', () => {
    let roomId = '';

    it('POST /api/room should create a valid new room', async () => {
        const payload = {
            title: 'Jest Verification Room',
            language: 'python',
            body: 'print("Initial Code")',
            author_name: 'Tester'
        };
        const res = await axios.post(`${BASE_URL}/api/room`, payload);
        expect(res.status).toBe(201);
        expect(res.data.data).toBeDefined();
        roomId = res.data.data.id;
        expect(roomId).toBeTruthy();
    });

    it('GET /api/room/:id should fetch the created room metadata', async () => {
        const res = await axios.get(`${BASE_URL}/api/room/${roomId}`);
        expect(res.status).toBe(200);
        expect(res.data.data.title).toBe('Jest Verification Room');
        expect(res.data.data.language).toBe('python');
    });

    it('PATCH /api/room/:id should update code and record audit snapshots in sequential order', async () => {
        // Update 1
        await axios.patch(`${BASE_URL}/api/room/${roomId}`, {
            body: 'print("Snapshot 1")',
            author_name: 'Alice',
            action: 'edit'
        });

        // Update 2
        await axios.patch(`${BASE_URL}/api/room/${roomId}`, {
            body: 'print("Snapshot 2")',
            author_name: 'Bob',
            action: 'edit'
        });

        // Update 3
        await axios.patch(`${BASE_URL}/api/room/${roomId}`, {
            body: 'print("Snapshot 3")',
            author_name: 'Charlie',
            action: 'edit'
        });

        // Fetch History
        const historyRes = await axios.get(`${BASE_URL}/api/room/${roomId}/history`);
        expect(historyRes.status).toBe(200);
        const history = historyRes.data.data;
        expect(history.length).toBeGreaterThanOrEqual(3);

        // Verify Strict Sequential Ordering (id descending: most recent first)
        for (let i = 0; i < history.length - 1; i++) {
            expect(history[i].id).toBeGreaterThan(history[i + 1].id);
        }

        // Most recent should be Snapshot 3 by Charlie
        expect(history[0].code_snapshot).toContain('Snapshot 3');
        expect(history[0].author_name).toBe('Charlie');
    });
});

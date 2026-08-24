import io, { Socket } from 'socket.io-client';

const SERVER_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

describe('🌐 Socket.IO Real-Time Synchronization & Multi-Cursor Suite', () => {
    let socket1: Socket;
    let socket2: Socket;
    const testRoomId = `jest-room-${Date.now()}`;

    beforeAll((done) => {
        let connectedCount = 0;
        const checkDone = () => {
            connectedCount++;
            if (connectedCount === 2) done();
        };

        socket1 = io(SERVER_URL, { transports: ['polling', 'websocket'] });
        socket2 = io(SERVER_URL, { transports: ['polling', 'websocket'] });

        socket1.on('connect', checkDone);
        socket2.on('connect', checkDone);
    });

    afterAll(() => {
        socket1.disconnect();
        socket2.disconnect();
    });

    it('👥 Presence Roster: Should track and broadcast active users in a room', (done) => {
        socket1.emit('user:join', {
            roomId: testRoomId,
            user: { id: socket1.id, name: 'Alice', color: '#ff4d4f', activeFile: 'main.py' }
        });

        socket2.emit('user:join', {
            roomId: testRoomId,
            user: { id: socket2.id, name: 'Bob', color: '#40a9ff', activeFile: 'main.py' }
        });

        socket1.on('presence:update', (users: any[]) => {
            if (users.length === 2) {
                const names = users.map((u) => u.name);
                expect(names).toContain('Alice');
                expect(names).toContain('Bob');
                done();
            }
        });
    });

    it('✏️ Real-Time Code Sync: Should broadcast code changes to room peers', (done) => {
        const testCode = 'console.log("Real-time Jest sync!");';

        socket2.on('updateBody', (incomingCode: string) => {
            expect(incomingCode).toBe(testCode);
            done();
        });

        socket1.emit('updateBody', { value: testCode, roomId: testRoomId });
    });

    it('📍 Multi-Cursor Movement: Should broadcast peer cursor positions and selection', (done) => {
        const targetPos = { lineNumber: 5, column: 12 };

        socket2.on('cursor:update', (cursor: any) => {
            if (cursor.userId === socket1.id) {
                expect(cursor.position).toEqual(targetPos);
                expect(cursor.name).toBe('Alice');
                done();
            }
        });

        socket1.emit('cursor:move', { roomId: testRoomId, position: targetPos, selection: null });
    });
});

require('dotenv').config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';
import { ExpressPeerServer } from 'peer';
import CodeHistory from './models/history.model';
import sql from './models/db';
import { logger } from './utils';
import { UserPresence } from './types';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const app = express();
app.set('port', PORT);

const server = http.createServer(app);

// Middlewares
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(
    cors({
        allowedHeaders: ['Content-Type', 'Authorization'],
        origin: '*'
    })
);

// Health Probes
app.use('/', require('./routes/health.routes'));

// REST API Routes
app.use('/api/room', require('./routes/room.routes'));
app.use('/api/runner', require('./routes/runner.routes'));

// Self-Hosted PeerServer (WebRTC Signaling)
const peerServer = ExpressPeerServer(server, {
    path: '/'
});
app.use('/peerjs', peerServer);

// 30-Day TTL automated cleanup timer (every 24h & on startup)
setTimeout(() => CodeHistory.cleanupExpired(), 5000);
const cleanupInterval = setInterval(() => CodeHistory.cleanupExpired(), 24 * 60 * 60 * 1000);

// Static files in production
if (process.env.NODE_ENV === 'production') {
    logger.info('Environment is production, serving static frontend/build');
    app.use(express.static(path.resolve(__dirname, '..', 'frontend', 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..', 'frontend', 'build', 'index.html'));
    });
}

// Socket.io with WSS stickiness, EIO3 support, and Multi-Transport
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    allowEIO3: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    },
    transports: ['polling', 'websocket']
});

// In-Memory Presence Roster per Room: RoomId -> (SocketId -> UserPresence)
const presenceRegistry: Map<string, Map<string, UserPresence>> = new Map();

io.on('connection', (socket: Socket) => {
    let currentRoomId = '';
    let currentUser: UserPresence | null = null;

    // Room Join & Presence
    socket.on('joinroom', (roomId: string) => {
        currentRoomId = roomId;
        socket.join(roomId);
        if (presenceRegistry.has(roomId)) {
            const roomUsers = Array.from(presenceRegistry.get(roomId)!.values());
            socket.emit('presence:update', roomUsers);
        }
        socket.broadcast.to(roomId).emit('userjoined');
    });

    socket.on('user:join', ({ roomId, user }: { roomId: string; user: UserPresence }) => {
        currentRoomId = roomId;
        currentUser = { ...user, id: socket.id };
        socket.join(roomId);

        if (!presenceRegistry.has(roomId)) {
            presenceRegistry.set(roomId, new Map());
        }
        presenceRegistry.get(roomId)!.set(socket.id, currentUser);

        // Broadcast presence update to everyone in the room
        const roomUsers = Array.from(presenceRegistry.get(roomId)!.values());
        io.to(roomId).emit('presence:update', roomUsers);
        socket.broadcast.to(roomId).emit('userjoined');
    });

    // Real-Time Multi-Cursor Movement
    socket.on('cursor:move', ({ roomId, position, selection }: { roomId: string; position: { lineNumber: number; column: number }; selection: any }) => {
        if (currentUser) {
            currentUser.cursorPosition = position;
        }
        socket.broadcast.to(roomId).emit('cursor:update', {
            userId: socket.id,
            name: currentUser ? currentUser.name : 'Peer',
            color: currentUser ? currentUser.color : '#00adb5',
            position,
            selection
        });
    });

    // Multi-File Sync & Active File Switch
    socket.on('file:switch', ({ roomId, activeFile }: { roomId: string; activeFile: string }) => {
        if (currentUser) currentUser.activeFile = activeFile;
        socket.broadcast.to(roomId).emit('file:switched', { userId: socket.id, activeFile });
    });

    socket.on('files:sync', ({ roomId, files, activeFile }: { roomId: string; files: Record<string, string>; activeFile: string }) => {
        socket.broadcast.to(roomId).emit('files:synced', { files, activeFile });
    });

    // Code & Input Sync
    socket.on('updateBody', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('updateBody', value);
    });
    socket.on('updateInput', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('updateInput', value);
    });
    socket.on('setBody', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('setBody', value);
    });
    socket.on('setInput', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('setInput', value);
    });
    socket.on('setLanguage', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('setLanguage', value);
    });
    socket.on('setOutput', ({ value, roomId }: { value: string; roomId: string }) => {
        socket.broadcast.to(roomId).emit('setOutput', value);
    });

    // WebRTC Audio Signaling
    socket.on('joinAudioRoom', (roomId: string, userId: string) => {
        socket.broadcast.to(roomId).emit('userJoinedAudio', userId);
    });

    socket.on('leaveAudioRoom', (roomId: string, userId: string) => {
        socket.broadcast.to(roomId).emit('userLeftAudio', userId);
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
        if (currentRoomId && presenceRegistry.has(currentRoomId)) {
            presenceRegistry.get(currentRoomId)!.delete(socket.id);
            const remaining = Array.from(presenceRegistry.get(currentRoomId)!.values());
            io.to(currentRoomId).emit('presence:update', remaining);
            socket.broadcast.to(currentRoomId).emit('cursor:remove', { userId: socket.id });
        }
    });
});

server.listen(PORT, () => {
    logger.info(`Discode Server listening on port: ${PORT}`);
});

// Graceful Shutdown
function gracefulShutdown(signal: string) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    clearInterval(cleanupInterval);

    server.close(() => {
        logger.info('HTTP and Socket server closed.');
        sql.end((err) => {
            if (err) logger.error('Error closing database pool', err);
            else logger.info('Database connections closed cleanly.');
            process.exit(0);
        });
    });

    setTimeout(() => {
        logger.error('Shutdown timed out, forcefully exiting.');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

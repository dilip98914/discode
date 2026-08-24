require('dotenv').config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const app = express();
app.set('port', PORT);

const server = http.createServer(app);

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    cors({
        allowedHeaders: ['Content-Type'],
        origin: '*'
    })
);

// Routes
app.use('/api/room', require('./routes/room.routes'));
app.use('/api/runner', require('./routes/runner.routes'));

// Self-Hosted PeerServer (WebRTC Signaling)
import { ExpressPeerServer } from 'peer';
import CodeHistory from './models/history.model';

const peerServer = ExpressPeerServer(server, {
    path: '/'
});
app.use('/peerjs', peerServer);

// Run 30-day TTL cleanup every 24h & on startup
setTimeout(() => CodeHistory.cleanupExpired(), 5000);
setInterval(() => CodeHistory.cleanupExpired(), 24 * 60 * 60 * 1000);

// Static files in production
if (process.env.NODE_ENV === 'production') {
    console.log('Environment is production, serving static frontend/build');
    app.use(express.static(path.resolve(__dirname, '..', 'frontend', 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '..', 'frontend', 'build', 'index.html'));
    });
}

// Socket.io
import { Server, Socket } from 'socket.io';
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

io.on('connection', (socket) => {
    socket.on('joinroom', (roomId) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit('userjoined');
    });
    socket.on('leaveroom', (roomId) => {
        socket.leave(roomId);
    });

    socket.on('updateBody', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('updateBody', value);
    });
    socket.on('updateInput', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('updateInput', value);
    });

    socket.on('setBody', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('setBody', value);
    });
    socket.on('setInput', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('setInput', value);
    });
    socket.on('setLanguage', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('setLanguage', value);
    });
    socket.on('setOutput', ({ value, roomId }) => {
        socket.broadcast.to(roomId).emit('setOutput', value);
    });

    socket.on('joinAudioRoom', (roomId, userId) => {
        socket.broadcast.to(roomId).emit('userJoinedAudio', userId);

        socket.on('leaveAudioRoom', () => {
            socket.broadcast.to(roomId).emit('userLeftAudio', userId);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port: ${PORT}`);
});

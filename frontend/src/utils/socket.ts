import io from 'socket.io-client';
import { baseURL } from '../config/config';

const socket = io({
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
});

export default socket;

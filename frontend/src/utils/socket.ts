import io from 'socket.io-client';
import { baseURL } from '../config/config';

const socket = io(baseURL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
});

export default socket;

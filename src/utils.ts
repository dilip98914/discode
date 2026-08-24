import { Response } from 'express';
import { ApiResponse } from './types';

export const logger = {
    info: (msg: string, meta?: unknown): void => {
        console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (msg: string, meta?: unknown): void => {
        console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, meta ? JSON.stringify(meta) : '');
    },
    error: (msg: string, err?: unknown): void => {
        console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, err instanceof Error ? err.stack : err || '');
    }
};

const sendData = <T>(res: Response, message: string, data: T | undefined, success: boolean, status: number): void => {
    const payload: ApiResponse<T> = {
        success,
        message,
        data,
        timestamp: new Date().toISOString()
    };
    if (!success) {
        payload.error = message;
    }
    res.status(status).json(payload);
};

export function sendSuccess<T>(res: Response, message: string, data?: T, status: number = 200): void {
    sendData(res, message, data, true, status);
}

export function sendError(res: Response, message: string, data?: unknown, status: number = 400): void {
    sendData(res, message, data, false, status);
}

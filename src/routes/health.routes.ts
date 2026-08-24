import express from 'express';
import sql from '../models/db';
import { sendSuccess, sendError } from '../utils';

const router = express.Router();

router.get('/healthz', (_req, res) => {
    sendSuccess(res, 'Service is live', { status: 'healthy', uptime: process.uptime() });
});

router.get('/readyz', (_req, res) => {
    sql.query('SELECT 1', (err) => {
        if (err) {
            return sendError(res, 'Database connection unready', { error: err.message }, 503);
        }
        sendSuccess(res, 'Service is ready', {
            status: 'ready',
            memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            uptime: process.uptime()
        });
    });
});

export = router;

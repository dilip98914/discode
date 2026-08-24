import express from 'express';
import https from 'https';
import { sendSuccess, sendError } from '../utils';

const router = express.Router();

function httpRequest(url: string, method: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const postData = data ? JSON.stringify(data) : null;

        const options: https.RequestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json);
                } catch (e) {
                    resolve({ raw: body });
                }
            });
        });

        req.on('error', (err) => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

router.post('/create', async (req, res) => {
    try {
        const { source_code, language, input } = req.body;
        const payload = {
            source_code: source_code || '',
            language: language || 'c',
            input: input || '',
            api_key: 'guest'
        };
        const data = await httpRequest('https://api.paiza.io/runners/create', 'POST', payload);
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/status', async (req, res) => {
    try {
        const id = req.query.id as string;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const data = await httpRequest(`https://api.paiza.io/runners/get_status?id=${encodeURIComponent(id)}&api_key=guest`, 'GET');
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/details', async (req, res) => {
    try {
        const id = req.query.id as string;
        if (!id) return res.status(400).json({ error: 'id is required' });
        const data = await httpRequest(`https://api.paiza.io/runners/get_details?id=${encodeURIComponent(id)}&api_key=guest`, 'GET');
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export = router;

import express from 'express';
import { executeCodeLocal } from '../runner/localRunner';

const router = express.Router();
const jobStore: { [id: string]: any } = {};

router.post('/create', async (req, res) => {
    try {
        const { source_code, language, input } = req.body;
        const result = await executeCodeLocal({ source_code, language, input });
        jobStore[result.id] = result;

        // Auto-cleanup job after 5 minutes
        setTimeout(() => {
            delete jobStore[result.id];
        }, 300000);

        res.json({ id: result.id, status: result.status });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/status', (req, res) => {
    const id = req.query.id as string;
    const job = jobStore[id];
    if (!job) {
        return res.json({ id, status: 'completed' });
    }
    res.json({ id, status: job.status });
});

router.get('/details', (req, res) => {
    const id = req.query.id as string;
    const job = jobStore[id];
    if (!job) {
        return res.json({ id, stdout: '', stderr: 'Execution output not found or expired', status: 'error' });
    }
    res.json({
        id: job.id,
        status: job.status,
        stdout: job.stdout,
        stderr: job.stderr,
        build_stderr: job.build_stderr || '',
        time: job.time
    });
});

export = router;

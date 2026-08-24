import express from 'express';
import { executeCodeLocal } from '../runner/localRunner';
import { RunnerJob, RunOptions } from '../types';

const router = express.Router();
const jobStore: Map<string, RunnerJob> = new Map();

router.post('/create', async (req, res) => {
    try {
        const { source_code, language, input, files }: RunOptions = req.body;
        const result = await executeCodeLocal({ source_code: source_code || '', language: language || 'python', input, files });
        jobStore.set(result.id, result);

        // Auto-cleanup job after 5 minutes
        setTimeout(() => {
            jobStore.delete(result.id);
        }, 300000);

        res.json({ id: result.id, status: result.status });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Runner internal error';
        res.status(500).json({ error: message });
    }
});

router.get('/status', (req, res) => {
    const id = req.query.id as string;
    const job = id ? jobStore.get(id) : undefined;
    if (!job) {
        return res.json({ id, status: 'completed' });
    }
    res.json({ id, status: job.status });
});

router.get('/details', (req, res) => {
    const id = req.query.id as string;
    const job = id ? jobStore.get(id) : undefined;
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

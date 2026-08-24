import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

interface RunOptions {
    source_code: string;
    language: string;
    input?: string;
    timeoutMs?: number;
}

interface RunResult {
    id: string;
    status: 'completed' | 'error' | 'timeout';
    stdout: string;
    stderr: string;
    build_stderr?: string;
    time?: number;
}

export async function executeCodeLocal(options: RunOptions): Promise<RunResult> {
    const { source_code, language, input = '', timeoutMs = 7000 } = options;
    const runId = 'run_' + Math.random().toString(36).substring(2, 12);
    const tempDir = path.join(os.tmpdir(), 'discode_' + runId);
    await fs.promises.mkdir(tempDir, { recursive: true });

    const startTime = Date.now();

    try {
        const lang = language ? language.toLowerCase() : 'python';

        if (lang === 'python' || lang === 'python3') {
            const scriptPath = path.join(tempDir, 'script.py');
            await fs.promises.writeFile(scriptPath, source_code, 'utf8');
            const result = await spawnProcess('python3', [scriptPath], input, timeoutMs, tempDir);
            return { id: runId, ...result, time: Date.now() - startTime };
        } else if (lang === 'javascript' || lang === 'js') {
            const scriptPath = path.join(tempDir, 'script.js');
            await fs.promises.writeFile(scriptPath, source_code, 'utf8');
            const result = await spawnProcess('node', [scriptPath], input, timeoutMs, tempDir);
            return { id: runId, ...result, time: Date.now() - startTime };
        } else if (lang === 'c') {
            const sourcePath = path.join(tempDir, 'main.c');
            const binPath = path.join(tempDir, 'main.out');
            await fs.promises.writeFile(sourcePath, source_code, 'utf8');

            // Compile
            const compileResult = await spawnProcess('gcc', ['-O2', sourcePath, '-o', binPath], '', 5000, tempDir);
            if (compileResult.status !== 'completed' || compileResult.stderr) {
                if (!fs.existsSync(binPath)) {
                    return {
                        id: runId,
                        status: 'error',
                        stdout: '',
                        stderr: '',
                        build_stderr: compileResult.stderr || compileResult.stdout || 'Compilation failed',
                        time: Date.now() - startTime
                    };
                }
            }

            const runResult = await spawnProcess(binPath, [], input, timeoutMs, tempDir);
            return { id: runId, ...runResult, time: Date.now() - startTime };
        } else if (lang === 'cpp' || lang === 'c_cpp') {
            const sourcePath = path.join(tempDir, 'main.cpp');
            const binPath = path.join(tempDir, 'main.out');
            await fs.promises.writeFile(sourcePath, source_code, 'utf8');

            // Compile
            const compileResult = await spawnProcess('g++', ['-O2', sourcePath, '-o', binPath], '', 5000, tempDir);
            if (compileResult.status !== 'completed' || compileResult.stderr) {
                if (!fs.existsSync(binPath)) {
                    return {
                        id: runId,
                        status: 'error',
                        stdout: '',
                        stderr: '',
                        build_stderr: compileResult.stderr || compileResult.stdout || 'Compilation failed',
                        time: Date.now() - startTime
                    };
                }
            }

            const runResult = await spawnProcess(binPath, [], input, timeoutMs, tempDir);
            return { id: runId, ...runResult, time: Date.now() - startTime };
        } else {
            return {
                id: runId,
                status: 'error',
                stdout: '',
                stderr: `Language '${language}' is not supported locally. Supported: python, javascript, c, cpp`,
                time: 0
            };
        }
    } finally {
        // Cleanup temp folder in background
        fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

function spawnProcess(
    command: string,
    args: string[],
    input: string,
    timeoutMs: number,
    cwd: string
): Promise<{ status: 'completed' | 'error' | 'timeout'; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        let isTimedOut = false;

        const child = spawn(command, args, {
            cwd,
            env: { PATH: process.env.PATH },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const timer = setTimeout(() => {
            isTimedOut = true;
            child.kill('SIGKILL');
        }, timeoutMs);

        if (input && child.stdin) {
            child.stdin.write(input);
            child.stdin.end();
        } else if (child.stdin) {
            child.stdin.end();
        }

        child.stdout.on('data', (chunk) => {
            if (stdout.length < 50000) stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            if (stderr.length < 50000) stderr += chunk.toString();
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({
                status: 'error',
                stdout,
                stderr: stderr ? `${stderr}\n${err.message}` : err.message
            });
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            if (isTimedOut) {
                resolve({
                    status: 'timeout',
                    stdout,
                    stderr: `Execution timed out after ${timeoutMs}ms`
                });
            } else {
                resolve({
                    status: code === 0 ? 'completed' : 'error',
                    stdout,
                    stderr
                });
            }
        });
    });
}

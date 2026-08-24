import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { RunOptions, RunnerJob } from '../types';

export async function executeCodeLocal(options: RunOptions): Promise<RunnerJob> {
    const { source_code, language, input = '', timeoutMs = 7000, files = {} } = options;
    const runId = 'run_' + Math.random().toString(36).substring(2, 12);
    const tempDir = path.join(os.tmpdir(), 'discode_' + runId);
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Write any additional project files to the temp directory
    for (const [filename, content] of Object.entries(files)) {
        if (filename && typeof content === 'string') {
            const filePath = path.join(tempDir, path.basename(filename));
            await fs.promises.writeFile(filePath, content, 'utf8');
        }
    }

    const startTime = Date.now();

    try {
        const lang = (language || 'python').toLowerCase();

        if (lang === 'python' || lang === 'python3') {
            const scriptPath = path.join(tempDir, 'main.py');
            await fs.promises.writeFile(scriptPath, source_code, 'utf8');
            const result = await spawnProcess('python3', [scriptPath], input, timeoutMs, tempDir);
            return { id: runId, ...result, time: Date.now() - startTime };
        } else if (lang === 'javascript' || lang === 'js') {
            const scriptPath = path.join(tempDir, 'main.js');
            await fs.promises.writeFile(scriptPath, source_code, 'utf8');
            const result = await spawnProcess('node', [scriptPath], input, timeoutMs, tempDir);
            return { id: runId, ...result, time: Date.now() - startTime };
        } else if (lang === 'java') {
            const sourcePath = path.join(tempDir, 'Main.java');
            await fs.promises.writeFile(sourcePath, source_code, 'utf8');

            const compileResult = await spawnProcess('javac', [sourcePath], '', 5000, tempDir);
            if (compileResult.status !== 'completed' || compileResult.stderr) {
                return {
                    id: runId,
                    status: 'error',
                    stdout: '',
                    stderr: '',
                    build_stderr: compileResult.stderr || compileResult.stdout || 'Java compilation failed',
                    time: Date.now() - startTime
                };
            }

            const runResult = await spawnProcess('java', ['-cp', tempDir, 'Main'], input, timeoutMs, tempDir);
            return { id: runId, ...runResult, time: Date.now() - startTime };
        } else if (lang === 'go' || lang === 'golang') {
            const sourcePath = path.join(tempDir, 'main.go');
            await fs.promises.writeFile(sourcePath, source_code, 'utf8');
            const runResult = await spawnProcess('go', ['run', sourcePath], input, timeoutMs, tempDir);
            return { id: runId, ...runResult, time: Date.now() - startTime };
        } else if (lang === 'c') {
            const sourcePath = path.join(tempDir, 'main.c');
            const binPath = path.join(tempDir, 'main.out');
            await fs.promises.writeFile(sourcePath, source_code, 'utf8');

            const compileResult = await spawnProcess('gcc', ['-O2', sourcePath, '-o', binPath], '', 5000, tempDir);
            if (compileResult.status !== 'completed' || compileResult.stderr) {
                if (!fs.existsSync(binPath)) {
                    return {
                        id: runId,
                        status: 'error',
                        stdout: '',
                        stderr: '',
                        build_stderr: compileResult.stderr || compileResult.stdout || 'C compilation failed',
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

            const compileResult = await spawnProcess('g++', ['-O2', sourcePath, '-o', binPath], '', 5000, tempDir);
            if (compileResult.status !== 'completed' || compileResult.stderr) {
                if (!fs.existsSync(binPath)) {
                    return {
                        id: runId,
                        status: 'error',
                        stdout: '',
                        stderr: '',
                        build_stderr: compileResult.stderr || compileResult.stdout || 'C++ compilation failed',
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
                stderr: `Language '${language}' is not supported. Supported: python, javascript, java, go, c, cpp`,
                time: 0
            };
        }
    } finally {
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

        const env: NodeJS.ProcessEnv = {
            ...process.env,
            HOME: os.tmpdir(),
            GOCACHE: path.join(os.tmpdir(), 'go-cache'),
            GOPATH: path.join(os.tmpdir(), 'go')
        };

        const child = spawn(command, args, { cwd, env });

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

        if (child.stdout) {
            child.stdout.on('data', (chunk: Buffer | string) => {
                if (stdout.length < 65536) stdout += chunk.toString();
            });
        }

        if (child.stderr) {
            child.stderr.on('data', (chunk: Buffer | string) => {
                if (stderr.length < 65536) stderr += chunk.toString();
            });
        }

        child.on('error', (err: Error) => {
            clearTimeout(timer);
            resolve({
                status: 'error',
                stdout,
                stderr: stderr ? `${stderr}\n${err.message}` : err.message
            });
        });

        child.on('close', (code: number | null) => {
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

import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:8080';

describe('⚡ Multi-Language Sandbox Runner Suite', () => {
    it('🐍 Python 3: Should execute code correctly', async () => {
        const payload = {
            source_code: 'print("Result:", 20 + 30)',
            language: 'python',
            input: ''
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('Result: 50');
    });

    it('📜 JavaScript (Node.js): Should execute code with stdin input', async () => {
        const payload = {
            source_code: 'const fs = require("fs"); const input = fs.readFileSync(0, "utf-8").trim(); console.log("Hello " + input);',
            language: 'javascript',
            input: 'Discode'
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('Hello Discode');
    });

    it('☕ Java (OpenJDK): Should compile with javac and execute with java', async () => {
        const payload = {
            source_code: 'public class Main { public static void main(String[] args) { System.out.println("JavaOutput:" + (10 * 10)); } }',
            language: 'java',
            input: ''
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('JavaOutput:100');
    });

    it('🐹 Go (Golang): Should execute with go run and isolated build cache', async () => {
        const payload = {
            source_code: 'package main\nimport "fmt"\nfunc main(){ fmt.Println("GoOutput:", 400 + 44) }',
            language: 'go',
            input: ''
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('GoOutput: 444');
    });

    it('⚙️ C (GCC): Should compile with gcc -O2 and execute binary', async () => {
        const payload = {
            source_code: '#include <stdio.h>\nint main(){ printf("COutput:%d\\n", 7 * 8); return 0; }',
            language: 'c',
            input: ''
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('COutput:56');
    });

    it('⚡ C++ (G++): Should compile with g++ -O2 and execute binary', async () => {
        const payload = {
            source_code: '#include <iostream>\nint main(){ std::cout << "CppOutput:" << (123 + 321) << std::endl; return 0; }',
            language: 'cpp',
            input: ''
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('CppOutput:444');
    });

    it('📁 Multi-File Execution: Should link multiple source files and modules', async () => {
        const payload = {
            source_code: 'import math_helper\nprint("MultiFileSum:", math_helper.add(15, 35))',
            language: 'python',
            input: '',
            files: {
                'math_helper.py': 'def add(x, y):\n    return x + y'
            }
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('completed');
        expect(detailsRes.data.stdout.trim()).toBe('MultiFileSum: 50');
    });

    it('🚨 Compilation Error Handling: Should report build errors gracefully for invalid C++', async () => {
        const payload = {
            source_code: '#include <iostream>\nint main(){ this_is_invalid_syntax; }',
            language: 'cpp'
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('error');
        expect(detailsRes.data.build_stderr).toContain('error');
    });

    it('⏱️ Sandbox Timeout Guard: Should abort infinite execution loops within timeout', async () => {
        const payload = {
            source_code: 'while True: pass',
            language: 'python',
            timeoutMs: 1500
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('timeout');
        expect(detailsRes.data.stderr).toContain('timed out');
    });

    it('🚫 Unsupported Language: Should return a friendly error message', async () => {
        const payload = {
            source_code: 'some unknown code',
            language: 'unsupported_lang_xyz'
        };
        const createRes = await axios.post(`${BASE_URL}/api/runner/create`, payload);
        const { id } = createRes.data;

        const detailsRes = await axios.get(`${BASE_URL}/api/runner/details?id=${id}`);
        expect(detailsRes.data.status).toBe('error');
        expect(detailsRes.data.stderr).toContain('not supported');
    });
});

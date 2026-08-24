export interface RoomData {
    id: string;
    title: string;
    body: string;
    input: string;
    language: string;
    created_at?: string;
    updated_at?: string;
    expires_at?: string;
}

export interface CreateRoomInput {
    title: string;
    body?: string;
    input?: string;
    language?: string;
    author_name?: string;
}

export interface UpdateRoomInput {
    id?: string;
    title?: string;
    body?: string;
    input?: string;
    language?: string;
    author_name?: string;
}

export interface CodeHistoryEntry {
    id?: number;
    room_id: string;
    author_name: string;
    code_snapshot: string;
    input_snapshot?: string;
    language?: string;
    action?: string;
    created_at?: string;
    expires_at?: string;
}

export interface RunnerJob {
    id: string;
    status: 'completed' | 'error' | 'timeout';
    stdout: string;
    stderr: string;
    build_stderr?: string;
    time?: number;
}

export interface RunOptions {
    source_code: string;
    language: string;
    input?: string;
    timeoutMs?: number;
    files?: Record<string, string>;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface UserPresence {
    id: string;
    name: string;
    color: string;
    isSpeaking?: boolean;
    isMuted?: boolean;
    cursorPosition?: {
        lineNumber: number;
        column: number;
    };
    activeFile?: string;
}

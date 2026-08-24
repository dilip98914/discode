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

export interface RemoteCursor {
    userId: string;
    name: string;
    color: string;
    position: {
        lineNumber: number;
        column: number;
    };
    selection?: any;
}

export interface CodeHistoryItem {
    id: number;
    room_id: string;
    author_name: string;
    code_snapshot: string;
    input_snapshot?: string;
    language?: string;
    action?: string;
    created_at?: string;
    expires_at?: string;
}

export interface ProjectFiles {
    [filename: string]: string;
}

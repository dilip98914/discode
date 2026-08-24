import { MysqlError } from 'mysql';
import sql from './db';

interface CodeHistoryEntry {
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

type Callback = (error: { error?: MysqlError; message: string } | null, data?: any) => void;

class CodeHistory {
    static record = (data: CodeHistoryEntry, callback?: Callback) => {
        sql.query('INSERT INTO code_history SET ?', data, (error, res) => {
            if (callback) {
                if (error) {
                    callback({ error, message: 'Mysql error recording history' });
                } else {
                    callback(null, { id: res.insertId, ...data });
                }
            }
        });
    };

    static findByRoomId = (roomId: string, callback: Callback) => {
        sql.query(
            'SELECT id, room_id, author_name, code_snapshot, input_snapshot, language, action, created_at, expires_at FROM code_history WHERE room_id = ? ORDER BY created_at DESC LIMIT 50',
            [roomId],
            (error, res) => {
                if (error) {
                    callback({ error, message: 'Mysql error fetching history' });
                } else {
                    callback(null, res);
                }
            }
        );
    };

    static cleanupExpired = (callback?: Callback) => {
        sql.query('DELETE FROM code_history WHERE expires_at < NOW()', (err1) => {
            sql.query('DELETE FROM rooms WHERE expires_at < NOW()', (err2, res) => {
                if (callback) {
                    if (err1 || err2) callback({ message: 'Cleanup error' });
                    else callback(null, { cleaned: true });
                }
            });
        });
    };
}

export = CodeHistory;

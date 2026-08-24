import { MysqlError } from 'mysql';
import sql from './db';
import { CodeHistoryEntry } from '../types';

type Callback<T = any> = (error: { error?: MysqlError; message: string } | null, data?: T) => void;

class CodeHistory {
    static record = (data: CodeHistoryEntry, callback?: Callback<CodeHistoryEntry>): void => {
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

    static findByRoomId = (roomId: string, callback: Callback<CodeHistoryEntry[]>): void => {
        sql.query(
            'SELECT id, room_id, author_name, code_snapshot, input_snapshot, language, action, created_at, expires_at FROM code_history WHERE room_id = ? ORDER BY id DESC, created_at DESC LIMIT 50',
            [roomId],
            (error, res) => {
                if (error) {
                    callback({ error, message: 'Mysql error fetching history' });
                } else {
                    callback(null, res as CodeHistoryEntry[]);
                }
            }
        );
    };

    static cleanupExpired = (callback?: Callback<{ cleaned: boolean }>): void => {
        sql.query('DELETE FROM code_history WHERE expires_at < NOW()', (err1) => {
            sql.query('DELETE FROM rooms WHERE expires_at < NOW()', (err2) => {
                if (callback) {
                    if (err1 || err2) callback({ message: 'Cleanup error' });
                    else callback(null, { cleaned: true });
                }
            });
        });
    };
}

export = CodeHistory;

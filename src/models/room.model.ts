import { MysqlError } from 'mysql';
import sql from './db';
import { uuid } from 'uuidv4';
import { RoomData } from '../types';

type Callback<T = RoomData> = (error: { error?: MysqlError; message: string } | null, data?: T) => void;

class Room {
    static create = (data: Partial<RoomData>, callback: Callback): void => {
        data.id = uuid();
        sql.query('INSERT INTO rooms SET ? ', data, (error) => {
            if (error) {
                callback({ error, message: 'Database insert failed' });
            } else {
                callback(null, data as RoomData);
            }
        });
    };

    static findById = (id: string, callback: Callback): void => {
        sql.query('SELECT * FROM rooms WHERE id = ?', [id], (error, res) => {
            if (error) {
                callback({ error, message: 'Database query failed' });
            } else if (!res || !res.length) {
                callback({ message: 'Room not found' });
            } else {
                callback(null, res[0] as RoomData);
            }
        });
    };

    static updateById = (data: Partial<RoomData>, callback: Callback): void => {
        const { id, ...fieldsToUpdate } = data;
        sql.query('UPDATE rooms SET ? WHERE id = ?', [fieldsToUpdate, id], (error, res) => {
            if (error) {
                callback({ error, message: 'Database update failed' });
            } else if (!res || !res.affectedRows) {
                callback({ message: 'Room not found' });
            } else {
                callback(null, data as RoomData);
            }
        });
    };
}

export = Room;

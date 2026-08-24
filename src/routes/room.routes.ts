import express from 'express';
import Room from '../models/room.model';
import CodeHistory from '../models/history.model';
import { sendSuccess, sendError } from '../utils';
import { isUuid } from 'uuidv4';
import { CreateRoomInput, UpdateRoomInput, RoomData } from '../types';

const router = express.Router();

router.get('/:id', (req, res) => {
    const { id } = req.params;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Invalid Room UUID format', {}, 400);
    }

    Room.findById(id, (error, data) => {
        if (error) {
            sendError(res, error.message, {}, 404);
        } else {
            sendSuccess(res, 'Room fetched successfully', data);
        }
    });
});

router.get('/:id/history', (req, res) => {
    const { id } = req.params;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Invalid Room UUID format', {}, 400);
    }

    CodeHistory.findByRoomId(id, (error, data) => {
        if (error) {
            sendError(res, error.message, {}, 500);
        } else {
            sendSuccess(res, 'Room history fetched successfully', data || []);
        }
    });
});

router.post('/:id/history', (req, res) => {
    const { id } = req.params;
    const { author_name, code_snapshot, input_snapshot, language, action } = req.body;

    if (!author_name || typeof author_name !== 'string' || !author_name.trim()) {
        return sendError(res, 'Author name is required', {}, 400);
    }

    CodeHistory.record(
        {
            room_id: id,
            author_name: author_name.trim().substring(0, 100),
            code_snapshot: code_snapshot || '',
            input_snapshot: input_snapshot || '',
            language: language || 'python',
            action: action || 'edit'
        },
        (error, data) => {
            if (error) {
                sendError(res, error.message, {}, 500);
            } else {
                sendSuccess(res, 'History snapshot recorded', data, 201);
            }
        }
    );
});

router.patch('/:id', (req, res) => {
    const { title, body, input, language, author_name }: UpdateRoomInput = req.body;
    const id = req.params.id;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Invalid Room UUID format', {}, 400);
    }

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        return sendError(res, "Room title cannot be empty if provided", {}, 400);
    }

    const updatePayload: Partial<RoomData> = { id };
    if (title !== undefined) updatePayload.title = title.trim();
    if (body !== undefined) updatePayload.body = body;
    if (input !== undefined) updatePayload.input = input;
    if (language !== undefined) updatePayload.language = language;

    Room.updateById(updatePayload, (error, data) => {
        if (error) {
            sendError(res, error.message, {}, error.message === 'Room not found' ? 404 : 500);
        } else {
            if (author_name || body) {
                CodeHistory.record(
                    {
                        room_id: id,
                        author_name: (author_name || 'Anonymous').trim().substring(0, 100),
                        code_snapshot: body || '',
                        input_snapshot: input || '',
                        language: language || 'python',
                        action: 'save'
                    },
                    () => {
                        sendSuccess(res, 'Room updated successfully', data);
                    }
                );
            } else {
                sendSuccess(res, 'Room updated successfully', data);
            }
        }
    });
});

router.post('/', (req, res) => {
    const { title, body, input, language, author_name }: CreateRoomInput = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
        return sendError(res, "Room title cannot be empty", {}, 400);
    }

    Room.create({ title: title.trim(), body: body || '', input: input || '', language: language || 'python' }, (error, data) => {
        if (error) {
            sendError(res, error.message, {}, 500);
        } else {
            if (data && data.id) {
                CodeHistory.record(
                    {
                        room_id: data.id,
                        author_name: (author_name || 'Room Creator').trim().substring(0, 100),
                        code_snapshot: body || '',
                        input_snapshot: input || '',
                        language: language || 'python',
                        action: 'create'
                    },
                    () => {
                        sendSuccess(res, 'Room created successfully', data, 201);
                    }
                );
            } else {
                sendSuccess(res, 'Room created successfully', data, 201);
            }
        }
    });
});

export = router;

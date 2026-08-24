import express from 'express';
import Room from './../models/room.model';
import CodeHistory from './../models/history.model';
import { sendSuccess, sendError } from './../utils';
import { isUuid } from 'uuidv4';

const router = express.Router();

router.get('/:id', (req, res) => {
    const { id } = req.params;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.findById(id, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room fetched successfully', data);
        }
    });
});

router.get('/:id/history', (req, res) => {
    const { id } = req.params;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    CodeHistory.findByRoomId(id, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            sendSuccess(res, 'Room history fetched successfully', data);
        }
    });
});

router.post('/:id/history', (req, res) => {
    const { id } = req.params;
    const { author_name, code_snapshot, input_snapshot, language, action } = req.body;

    if (!author_name) return sendError(res, "Author name is required");

    CodeHistory.record(
        {
            room_id: id,
            author_name,
            code_snapshot: code_snapshot || '',
            input_snapshot: input_snapshot || '',
            language: language || 'python',
            action: action || 'edit'
        },
        (error, data) => {
            if (error) {
                sendError(res, error.message);
            } else {
                sendSuccess(res, 'History recorded successfully', data);
            }
        }
    );
});

router.patch('/:id', (req, res) => {
    const { title, body, input, language, author_name } = req.body;
    if (!title) return sendError(res, "Title can't be empty");
    const id = req.params.id;

    if (!isUuid(id) && isNaN(+id)) {
        return sendError(res, 'Not a valid id');
    }

    Room.updateById({ title, body, id, input, language }, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            // Automatically log history entry
            if (author_name || body) {
                CodeHistory.record({
                    room_id: id,
                    author_name: author_name || 'Anonymous',
                    code_snapshot: body || '',
                    input_snapshot: input || '',
                    language: language || 'python',
                    action: 'save'
                });
            }
            sendSuccess(res, 'Room updated successfully', data);
        }
    });
});

router.post('/', (req, res) => {
    const { title, body, input, language, author_name } = req.body;
    if (!title) return sendError(res, "Title can't be empty");

    Room.create({ title, body, input, language }, (error, data) => {
        if (error) {
            sendError(res, error.message);
        } else {
            if (data && data.id) {
                CodeHistory.record({
                    room_id: data.id,
                    author_name: author_name || 'Room Creator',
                    code_snapshot: body || '',
                    input_snapshot: input || '',
                    language: language || 'python',
                    action: 'create'
                });
            }
            sendSuccess(res, 'Room created successfully', data);
        }
    });
});

export = router;

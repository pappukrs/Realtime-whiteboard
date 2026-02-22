import { Request, Response } from 'express';
import { BoardService } from '../services/board.service';

export class BoardController {
    static async getBoard(req: Request, res: Response) {
        try {
            const { roomId } = req.params;
            const board = await BoardService.getBoardState(roomId as string);
            if (!board) {
                return res.status(404).json({ error: 'Board not found' });
            }
            res.json(board);
        } catch (error) {
            console.error('Error in getBoard controller:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

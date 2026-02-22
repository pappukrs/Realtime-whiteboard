import { Router } from 'express';
import { BoardController } from '../controllers/board.controller';

const router = Router();

router.get('/:roomId', BoardController.getBoard);

export default router;

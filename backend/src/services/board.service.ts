import Board from '../models/Board';

export class BoardService {
    static async getBoardState(roomId: string) {
        try {
            return await Board.findOne({ roomId });
        } catch (error) {
            console.error('Error fetching board state:', error);
            throw error;
        }
    }

    static async saveBoardState(roomId: string, elements: any[]) {
        try {
            return await Board.findOneAndUpdate(
                { roomId },
                { elements },
                { upsert: true, new: true }
            );
        } catch (error) {
            console.error('Error saving board:', error);
            throw error;
        }
    }
}

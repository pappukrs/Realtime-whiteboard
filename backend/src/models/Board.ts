import mongoose, { Schema, Document } from 'mongoose';

export interface IBoard extends Document {
    roomId: string;
    elements: any[];
    updatedAt: Date;
}

const BoardSchema: Schema = new Schema(
    {
        roomId: { type: String, required: true, unique: true },
        elements: { type: Array, default: [] },
    },
    { timestamps: true }
);

export default mongoose.model<IBoard>('Board', BoardSchema);

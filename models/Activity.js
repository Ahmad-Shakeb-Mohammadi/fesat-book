import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', index: true },
    type: { type: String, enum: ['like', 'comment'] },
    comment: String, // only for comments
    createdAt: { type: Date, default: Date.now, index: true }
})
activitySchema.index({ userId: 1, createdAt: -1, postId: 1, type: 1});

export default mongoose.model('Activity', activitySchema);
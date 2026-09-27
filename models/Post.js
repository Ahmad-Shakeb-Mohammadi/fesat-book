import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    caption: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: null },
    mediaUrl: { type: String, default: null }, // will store secure_url for fast feed
    mediaPublicId: { type: String, default: null }, // NEW: for deletion
    mediaResourceType: { type: String, enum: ['image', 'video'], default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    lastViews: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, date: { type: Date, default: Date.now } }],
    viewersCount: { type: Number, default: 0 }
}, { timestamps: true });

postSchema.index({ userId: 1, createdAt: -1, _id: -1 });
export default mongoose.model('Post', postSchema);
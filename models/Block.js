import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
    blocker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    blocked: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    createdAt: {type: Date,default: Date.now}
})

blockSchema.index({blocker: 1, blocked: 1},{unique: true})

export default mongoose.model("Block", blockSchema);
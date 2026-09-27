import mongoose from "mongoose";
const attachmentSchema = new mongoose.Schema({
    type: { type: String, enum: ["image", "video", "file"], required: true },
    public_id: { type: String, required: true },
    resource_type: { type: String, enum: ["image", "video", "raw"], required: true },
    delivery_type: { type: String, enum: ["upload", "authenticated"], default: "authenticated" },
    format: { type: String, default: null },
    originalName: { type: String, default: null },
    size: { type: Number, default: null },
    mimeType: { type: String, default: null },
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, default: "", maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    editedAt: { type: Date, default: null },
    deletedForEveryoneAt: { type: Date, default: null },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.pre("validate", function () {
    const hasText = this.text && this.text.trim().length > 0;
    const hasAttachments = this.attachments && this.attachments.length > 0;
    if (!hasText && !hasAttachments) throw new Error("Message must contain text or attachment");
});
export default mongoose.model("Message", messageSchema);
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    gender: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    profilePublicId: { type: String, default: null }, // Cloudinary public_id
    coverPublicId: { type: String, default: null },
    profileUrl: { type: String, default: "/images/default-profile.png" },
    coverUrl: { type: String, default: "/images/default-cover.webp" },
    lastSeen: {
        date: { type: Date, default: Date.now },
        lastPostId: { type: mongoose.Schema.Types.ObjectId, default: null },
        lastCreatedAt: { type: Date, default: null }
    },
    job: { type: String, default: "Fesat Book User" },
    followingCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    viewersCount: { type: Number, default: 0 },
    lastViews: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, date: { type: Date, default: Date.now } }]
}, {
    timestamps: true
})

userSchema.index({ createdAt: -1, _id: -1 })

export default mongoose.model("User", userSchema);
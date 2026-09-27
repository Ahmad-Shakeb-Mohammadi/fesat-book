import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member"
        },

        joinedAt: {
            type: Date,
            default: Date.now
        },

        leftAt: {
            type: Date,
            default: null
        },

        lastReadAt: {
            type: Date,
            default: null
        },
        isMuted: {
            type: Boolean,
            default: false
        }
    },
    { _id: false }
);

const conversationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["direct", "group"],
            required: true,
            index: true
        },

        name: {
            type: String,
            trim: true,
            default: null
        },

        imagePublicId: { type: String, default: null },

        imageUrl: {
            type: String,
            default: '/images/default-group.png'
        },

        participants: {
            type: [participantSchema],
            required: true
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null
        },

        lastMessageAt: {
            type: Date,
            default: Date.now,
            index: true
        },

        directKey: {
            type: String,
            unique: true,
            sparse: true
        }
    },
    {
        timestamps: true
    }
);

conversationSchema.index({
    "participants.userId": 1,
    lastMessageAt: -1
});

conversationSchema.pre("validate", function () {
    if (this.type === "direct") {
        const participantIds = this.participants.map((participant) =>
            participant.userId.toString()
        );

        if (new Set(participantIds).size !== 2) {
            throw new Error("Direct conversation must have exactly 2 participants");
        }

        this.directKey = participantIds.sort().join("_");
        this.name = null;
        this.imageUrl = null;
    }

    if (this.type === "group") {
        if (!this.name || this.name.trim().length < 2 || this.name.trim().length > 45) {
            throw new Error("Group conversation name should be 2-45");
        }

        if (this.participants.length < 2) {
            throw new Error("Group conversation must have at least 2 participants");
        }

        this.directKey = undefined;
    }

});

export default mongoose.model("Conversation", conversationSchema);
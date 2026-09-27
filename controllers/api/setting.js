import { validationResult } from "express-validator";
import User from "../../models/User.js";
import Block from "../../models/Block.js";
import { Types } from "mongoose";
import bcrypt from "bcryptjs";
import RefreshToken from "../../models/RefreshToken.js";
import Post from "../../models/Post.js";
import Follow from "../../models/Follow.js"
import Activity from "../../models/Activity.js";
import { deleteFromCloudinary } from "../../services/cloudinaryService.js";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import cloudinary from "../../config/cloudinary.js";
import { emitToUser, emitToUsers } from "../../config/socket.js";

export const updatePersonalInforamtion = async function (req, res) {
    try {
        let name = req.body.name;
        let country = req.body.country;
        let city = req.body.city;
        let job = req.body.job;
        let gender = req.body.gender;
        let errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).json({ message: errors.array()[0].msg })
        }
        if (gender == 'other') {
            return res.status(400).json({ message: 'Gender can\'t be other' })
        }
        let user = await User.findById(req.userId)
        if (!user) return res.status(400).json({ message: 'Not authenticated user' });
        user.name = name; user.country = country;
        user.city = city; user.job = job; user.gender = gender;
        user = await user.save()
        res.json({ ...user._doc, password: undefined, lastPostId: undefined })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'something went wrong!' })
    }

}

export const removeCoverPhoto = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user.coverPublicId) {
            await deleteFromCloudinary(user.coverPublicId, "image", "upload").catch(() => { });
        }
        await User.findByIdAndUpdate(req.userId, { coverUrl: "/images/default-cover.webp", coverPublicId: null });
        res.json({ coverUrl: "/images/default-cover.webp" });
    } catch (err) {
        res.status(400).json({ message: 'Failed' });
    }
};

export const removeProfilePhoto = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user.profilePublicId) {
            await deleteFromCloudinary(user.profilePublicId, "image", "upload").catch(() => { });
        }
        await User.findByIdAndUpdate(req.userId, { profileUrl: "/images/default-profile.png", profilePublicId: null });
        res.json({ profileUrl: "/images/default-profile.png" });
    } catch (err) {
        res.status(400).json({ message: 'Failed' });
    }
};

export const getBlockedPeople = async function (req, res) {
    try {
        const ITEMS_PER_PAGE = 7;
        let lastId = req.query.lastId || null;
        let total;
        let query = { blocker: req.userId }
        if (!lastId) {
            total = await Block.countDocuments({ blocker: req.userId })
        } else {
            query._id = { $lt: lastId }
        }

        let blockedUsers = await Block.find(query).populate({
            path: "blocked",
            select: "_id profileUrl name job"
        }).sort({ _id: -1 }).limit(ITEMS_PER_PAGE + 1).lean()

        let hasMore = blockedUsers.length > ITEMS_PER_PAGE;
        blockedUsers = hasMore ? blockedUsers.slice(0, ITEMS_PER_PAGE) : blockedUsers;

        let users = blockedUsers.map(el => ({ blocked: el.blocked, date: el.createdAt }))
        let nextCursor = blockedUsers.length > 0 ? blockedUsers[blockedUsers.length - 1]._id : null;
        res.json({
            users,
            ...(total !== undefined && { total }),
            hasMore,
            nextCursor
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'something went wrong!' })
    }
}

export const postUnblockUser = async function (req, res) {
    try {
        let blockId = req.body.blockId;
        if (!blockId) return res.status(404).json({ message: 'Validation Failed!' });
        let result = await Block.deleteOne({
            blocked: new Types.ObjectId(blockId),
            blocker: new Types.ObjectId(req.userId)
        })
        if (result.deletedCount == 0) {
            return res.status(404).json({ message: 'Unauthorized Operation!' })
        }
        res.json({ message: 'Successfully Unblocked user!' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'something went wrong!' })
    }
}

export const postChangePassword = async function (req, res) {
    try {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ message: errors.array()[0].msg })
        }
        let oldPassword = req.body.oldPassword;
        let newPassword = req.body.newPassword;
        if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Provide Passwords!!!' });
        let [user, hash] = await Promise.all([
            User.findById(req.userId).select("password").lean(),
            bcrypt.hash(newPassword, 10)
        ])
        if (!user) return res.status(404).json({ message: 'User is not Found!' });
        let isMatch = await bcrypt.compare(oldPassword, user.password)
        if (!isMatch) return res.status(400).json({ message: 'Current Password is wrong!' });
        await User.findByIdAndUpdate(req.userId, {
            password: hash
        })
        res.status(200).json({ message: 'Password updated successfully' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Update Failed!' })
    }

}

export const postChangeEmail = async function (req, res) {
    try {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ message: errors.array()[0].msg });
        }

        let { currentPassword, newEmail } = req.body;

        if (!currentPassword || !newEmail) {
            return res.status(400).json({ message: 'Provide Inputs!' });
        }

        let user = await User.findById(req.userId).select("email password").lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.email === newEmail) {
            return res.status(422).json({ message: 'New Email is the same as Current Email' });
        }

        let isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(422).json({ message: 'Wrong Password' });
        }

        await User.updateOne(
            { _id: req.userId },
            { $set: { email: newEmail } }
        );

        res.status(200).json({ message: 'Email updated successfully!', newEmail });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(422).json({ message: 'Email already taken' });
        }
        console.log(err);
        res.status(500).json({ message: 'Update Failed!' });
    }
};


export const postLogout = async function (req, res, next) {
    let refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await RefreshToken.deleteOne({ token: refreshToken })
    }
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    })

    res.status(200).json({ message: 'Logout successfully' })
}

export const deleteAccount = async function (req, res, next) {
    const { password, confirmation } = req.body
    const userId = new Types.ObjectId(req.userId)
    if (!password || !confirmation) {
        return res.status(400).json({ message: "Password and confirmation required" })
    }
    if (confirmation !== "DELETE") {
        return res.status(400).json({ message: 'Please type "DELETE" to confirm' })
    }
    const user = await User.findById(userId)
    if (!user) {
        return res.status(404).json({ message: "User not found" })
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (!isPasswordCorrect) {
        return res.status(400).json({ message: "Wrong password" })
    }
    try {

        // Background bulk Cloudinary cleanup - fire and forget
        const cleanupCloudinaryMedia = (publicIds, type = "authenticated") => {
            if (!publicIds || publicIds.length === 0) return;
            cloudinary.api.delete_resources(publicIds, { resource_type: "image", type }).catch(() => { });
            cloudinary.api.delete_resources(publicIds, { resource_type: "video", type }).catch(() => { });
            cloudinary.api.delete_resources(publicIds, { resource_type: "raw", type }).catch(() => { });
        };

        // ========== PHASE 1: ALL READS IN ONE PARALLEL BATCH (1 roundtrip) ==========

        const [followingDocs, followerDocs, likeCounts, commentCounts, userPosts, myConversations] = await Promise.all([
            Follow.find({ follower: userId }, { following: 1 }).lean(),
            Follow.find({ following: userId }, { follower: 1 }).lean(),
            Activity.aggregate([
                { $match: { userId: userId, type: 'like' } },
                { $group: { _id: '$postId', count: { $sum: 1 } } }
            ]),
            Activity.aggregate([
                { $match: { userId: userId, type: 'comment' } },
                { $group: { _id: '$postId', count: { $sum: 1 } } }
            ]),
            Post.find({ userId }, { _id: 1, mediaPublicId: 1 }),
            Conversation.find({ "participants.userId": userId }),
        ]);

        const followingIds = followingDocs.map(doc => doc.following);
        const followerIds = followerDocs.map(doc => doc.follower);
        const userPostIds = userPosts.map(post => post._id);
        const postMediaIds = userPosts.filter(p => p.mediaPublicId).map(p => p.mediaPublicId);

        // ========== PHASE 2: ALL INDEPENDENT WRITE BRANCHES IN PARALLEL ==========

        await Promise.all([

            // Branch A: follows + follower/following counts
            (async () => {
                if (followingIds.length > 0) {
                    await User.updateMany({ _id: { $in: followingIds } }, { $inc: { followerCount: -1 } });
                }
                if (followerIds.length > 0) {
                    await User.updateMany({ _id: { $in: followerIds } }, { $inc: { followingCount: -1 } });
                }
                await Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] });
            })(),

            // Branch B: activities + post like/comment count fixes
            (async () => {
                if (likeCounts.length > 0) {
                    await Post.bulkWrite(likeCounts.map(({ _id: postId, count }) => ({
                        updateOne: { filter: { _id: postId }, update: { $inc: { likes: -count } } }
                    })));
                }
                if (commentCounts.length > 0) {
                    await Post.bulkWrite(commentCounts.map(({ _id: postId, count }) => ({
                        updateOne: { filter: { _id: postId }, update: { $inc: { comments: -count } } }
                    })));
                }
                await Activity.deleteMany({ userId });
            })(),

            // Branch C: user's posts + activities on them + post media
            (async () => {
                if (userPostIds.length > 0) {
                    await Activity.deleteMany({ postId: { $in: userPostIds } });
                }
                cleanupCloudinaryMedia(postMediaIds, "upload");
                await Post.deleteMany({ userId });
            })(),

            // Branch D: messenger - all conversations handled in parallel
            (async () => {
                await Promise.all(myConversations.map(async (conv) => {
                    const convId = conv._id;
                    const activeParticipants = conv.participants.filter(p => !p.leftAt);
                    const remaining = activeParticipants.filter(p => p.userId.toString() !== userId.toString());

                    if (conv.type === "group" && remaining.length >= 2) {
                        // SURVIVING GROUP: remove me quietly + erase only MY messages
                        const myMessages = await Message.find({ conversationId: convId, senderId: userId })
                            .select("_id attachments").lean();
                        const myMessageIds = myMessages.map(m => m._id);
                        const myMediaIds = myMessages.flatMap(m => m.attachments.map(a => a.public_id)).filter(Boolean);

                        await Message.deleteMany({ conversationId: convId, senderId: userId });

                        // Fix conversation pointer if my message was the last one
                        if (myMessageIds.some(id => conv.lastMessage && id.toString() === conv.lastMessage.toString())) {
                            const latest = await Message.findOne({ conversationId: convId }).sort({ createdAt: -1 });
                            conv.lastMessage = latest ? latest._id : null;
                            conv.lastMessageAt = latest ? latest.createdAt : new Date();
                        }

                        const me = conv.participants.find(p => p.userId.toString() === userId.toString());
                        me.leftAt = new Date();
                        const activeAdmins = conv.participants.filter(p => !p.leftAt && p.role === "admin");
                        if (me.role === "admin" && activeAdmins.length === 0) {
                            const next = remaining.find(p => p.role === "member") || remaining[0];
                            if (next) next.role = "admin";
                        }
                        await conv.save();

                        await conv.populate("participants.userId", "name profileUrl job");
                        const survivorIds = conv.participants.filter(p => !p.leftAt).map(p => p.userId._id.toString());
                        emitToUsers(survivorIds, "conversation:updated", { conversation: conv });

                        cleanupCloudinaryMedia(myMediaIds);
                    } else {
                        // DIRECT conversation or dissolving group: erase EVERYTHING
                        const msgs = await Message.find({ conversationId: convId }).select("attachments").lean();
                        const allMediaIds = msgs.flatMap(m => m.attachments.map(a => a.public_id)).filter(Boolean);

                        if (conv.type === "group" && conv.imagePublicId) {
                            deleteFromCloudinary(conv.imagePublicId, "image", "upload").catch(() => { });
                        }

                        await Promise.all([
                            Message.deleteMany({ conversationId: convId }),
                            Conversation.deleteOne({ _id: convId })
                        ]);

                        remaining.forEach(p =>
                            emitToUser(p.userId.toString(), "conversation:deleted", { conversationId: convId.toString() })
                        );

                        cleanupCloudinaryMedia(allMediaIds);
                    }
                }));
            })(),

            // Branch E: blocks + refresh tokens
            Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
            RefreshToken.deleteMany({ userId }),
        ]);

        // ========== PHASE 3: DELETE THE ACCOUNT ITSELF (last - tombstone) ==========

        if (user.profilePublicId) {
            deleteFromCloudinary(user.profilePublicId, "image", "upload").catch(() => { });
        }
        if (user.coverPublicId) {
            deleteFromCloudinary(user.coverPublicId, "image", "upload").catch(() => { });
        }
        await User.findByIdAndDelete(userId)

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        })

        res.status(200).json({ message: "Account deleted successfully" })

    } catch (err) {
        console.error('Account deletion error:', err)
        return res.status(500).json({ message: "Failed to delete account. Please try again." })
    }
}

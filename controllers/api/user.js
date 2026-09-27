import User from "../../models/User.js"
import Follow from "../../models/Follow.js"
import Block from "../../models/Block.js"
import Post from "../../models/Post.js"
import Activity from "../../models/Activity.js"
import { Types } from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { FOLDER_RULES, ALLOWED_FOLDERS } from "../../services/cloudinaryService.js";
import { deleteFromCloudinary, generatePublicUrl } from "../../services/cloudinaryService.js";

export const getUser = async function (req, res, next) {
    try {
        let user = await User.findById(req.userId).select("-password -lastSeen -lastViews").lean()
        if (!user) {
            return res.status(400).json({ message: 'Invalid User' })
        }
        res.json(user)
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Error in validating user' })
    }

}

export const postFollow = async function (req, res, next) {
    try {
        let id = req.body.id;
        if (!id) {
            return res.status(400).json({ message: 'Id required' })
        }
        let user = await User.findById(id);
        if (!user) {
            return res.status(400).json({ message: 'invalid request' })
        }
        let isBlocked = await Block.exists({
            $or: [
                { blocker: req.userId, blocked: id },
                { blocker: id, blocked: req.userId }
            ]
        });
        if (isBlocked) {
            return res.status(400).json({ message: 'BLOCKED' });
        }
        let existingFollow = await Follow.findOne({ follower: req.userId, following: id })
        if (!existingFollow) {
            await Follow.create({
                follower: req.userId,
                following: id
            })
            await User.updateOne({ _id: req.userId }, { $inc: { followingCount: 1 } })
            await User.updateOne({ _id: id }, { $inc: { followerCount: 1 } })
            res.status(200).json({ message: 'followed' })
        } else {
            await existingFollow.deleteOne()
            await User.updateOne({ _id: req.userId }, { $inc: { followingCount: -1 } })
            await User.updateOne({ _id: id }, { $inc: { followerCount: -1 } })
            res.status(200).json({ message: 'unfollowed' })
        }
    } catch (err) {
        console.log(err)
        res.status(400).json({ status: 400 })
    }

}

export const getUsers = async function (req, res, next) {
    try {
        const ITEMS_PER_PAGE = 7;
        let lastCreatedAt = req.query.createdAt || null;
        let lastId = req.query._id || null;
        let userId = req.userId
        let hasMore = false;

        let [followingIds, blockedByMe, blockedMe] = await Promise.all([
            Follow.find({ follower: userId }).distinct("following"),
            Block.find({ blocker: userId }).distinct("blocked"),
            Block.find({ blocked: req.userId }).distinct("blocker")
        ])
        let excludedIds = [userId, ...followingIds, ...blockedByMe, ...blockedMe]
        let query = {
            _id: { $nin: excludedIds }
        }
        if (lastCreatedAt && lastId) {
            lastCreatedAt = new Date(lastCreatedAt);
            lastId = new Types.ObjectId(lastId)
            query.$or = [
                { createdAt: { $lt: lastCreatedAt } },
                {
                    createdAt: lastCreatedAt,
                    _id: { $lt: lastId }
                }
            ]
        }
        let users = await User.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).select('_id name job gender city country coverUrl profileUrl createdAt').lean()
        if (users.length > ITEMS_PER_PAGE) {
            hasMore = true;
            users = users.slice(0, ITEMS_PER_PAGE)
        }
        res.json({ users, hasMore })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to Get Users!!!' })
    }

}

export const getFollowing = async function (req, res, next) {
    try {
        let ITEMS_PER_PAGE = 7;
        let cursor = req.query.cursor;
        let query = { follower: req.userId }
        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) }
        }
        let followingUsers = await Follow.find(query).populate({
            path: "following",
            select: "_id profileUrl name job gender country city"
        }).sort({ createdAt: -1 }).limit(ITEMS_PER_PAGE + 1).lean()

        let hasMore = followingUsers.length > ITEMS_PER_PAGE;

        let following = hasMore ? followingUsers.slice(0, ITEMS_PER_PAGE) : followingUsers;
        let lastId = following[following.length - 1]?._id;
        following = following.map(el => el.following)
        res.json({ following, hasMore, lastId })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to load Following Users!!!' })
    }

}

export const postUnfollow = async function (req, res, next) {
    let userId = req.body.userId;
    let result = await Follow.deleteOne({ follower: req.userId, following: userId })
    if (result.deletedCount > 0) {
        await User.updateOne({ _id: req.userId }, { $inc: { followingCount: -1 } })
        await User.updateOne({ _id: userId }, { $inc: { followerCount: -1 } })
        let hasPeople = await Follow.countDocuments({
            follower: req.userId
        });
        res.json({ hasPeople })
    } else {
        res.status(400).json({ message: 'Unfollowing user Failed!!!' })
    }

}

export const getFollower = async function (req, res, next) {
    try {
        let ITEMS_PER_PAGE = 7;
        let cursor = req.query.cursor;
        let query = { following: req.userId }
        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) };
        }
        let followerUsers = await Follow.find(query).populate({
            path: "follower",
            select: "_id profileUrl name job gender country city"
        }).sort({ createdAt: -1 }).limit(ITEMS_PER_PAGE + 1).lean();

        let hasMore = followerUsers.length > ITEMS_PER_PAGE;
        let followers = hasMore ? followerUsers.slice(0, ITEMS_PER_PAGE) : followerUsers;
        let lastId = followers[followers.length - 1]?._id;
        followers = followers.map(el => el.follower)
        res.json({ followers, hasMore, lastId })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get followers!!!' })
    }

}

export const postBlock = async function (req, res, next) {
    try {
        let userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: 'Invalid request!!!' })
        }

        // Check if block already exists
        const existingBlock = await Block.findOne({
            blocker: req.userId,
            blocked: userId
        });

        if (existingBlock) {
            return res.status(400).json({ message: 'Already blocked' });
        }

        // Get follow status BEFORE any changes
        let [isFollowing, isFollowedBy] = await Promise.all([
            Follow.exists({ follower: req.userId, following: userId }),
            Follow.exists({ follower: userId, following: req.userId })
        ]);

        await Block.create({ blocker: req.userId, blocked: userId });

        // Handle all cleanup in parallel

        await Promise.all([
            Follow.deleteMany({
                $or: [
                    { follower: req.userId, following: userId },
                    { follower: userId, following: req.userId }
                ]
            }),

            // Handle activities and post counts
            (async () => {
                const myPostIds = await Post.find({ userId: req.userId }).distinct('_id');

                if (myPostIds.length === 0) return;

                // Convert userId to ObjectId for aggregation (since aggregation doesn't auto-cast)
                const blockedUserId = new Types.ObjectId(userId)

                // Get counts per post for blocked user's activities
                const activities = await Activity.aggregate([
                    {
                        $match: {
                            userId: blockedUserId,          // now ObjectId
                            postId: { $in: myPostIds }      // myPostIds are ObjectIds
                        }
                    },
                    {
                        $group: {
                            _id: {
                                postId: '$postId',
                                type: { $toLower: '$type' } // normalize to lowercase
                            },
                            count: { $sum: 1 }
                        }
                    }
                ]);

                // Delete all activities from blocked user on your posts
                await Activity.deleteMany({
                    userId: blockedUserId,
                    postId: { $in: myPostIds }
                });

                // Bulk update posts
                if (activities.length > 0) {
                    const bulkOps = activities.map(item => ({
                        updateOne: {
                            filter: { _id: item._id.postId },
                            update: {
                                $inc: {
                                    ...(item._id.type === 'like' && { likes: -item.count }),
                                    ...(item._id.type === 'comment' && { comments: -item.count })
                                }
                            }
                        }
                    }));

                    await Post.bulkWrite(bulkOps);
                }
            })()
        ]);

        // Update user counts
        const myUpdates = {};
        if (isFollowing) myUpdates.followingCount = -1;
        if (isFollowedBy) myUpdates.followerCount = -1;

        const theirUpdates = {};
        if (isFollowing) theirUpdates.followerCount = -1;
        if (isFollowedBy) theirUpdates.followingCount = -1;

        await Promise.all([
            User.updateOne({ _id: req.userId }, { $inc: myUpdates }),
            User.updateOne({ _id: userId }, { $inc: theirUpdates })
        ]);

        let hasPeople = await Follow.countDocuments({ following: req.userId });
        res.json({ hasPeople });

    } catch (err) {
        console.log(err);
        res.status(400).json({ message: "Error in blocking user!!!" });
    }
}

export const uploadProfile = async (req, res) => {
    try {
        const { public_id } = req.body; // from frontend after direct upload
        if (!public_id) return res.status(400).json({ message: "public_id required" });

        if (!public_id.startsWith(ALLOWED_FOLDERS.PROFILE + "/")) {
            return res.status(400).json({ message: "Invalid folder" });
        }

        // Secure fetch from Cloudinary
        let resource;
        try {
            resource = await cloudinary.api.resource(public_id, { resource_type: "image", type: "upload" });
        } catch {
            return res.status(400).json({ message: "Image not found in Cloudinary" });
        }

        const rules = FOLDER_RULES[ALLOWED_FOLDERS.PROFILE];
        if (resource.bytes > rules.max_bytes) {
            await deleteFromCloudinary(public_id, "image", "upload").catch(() => { });
            return res.status(400).json({ message: "Image too large. Max 5MB" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(400).json({ message: "Invalid user" });

        // Delete old Cloudinary image if exists and not default
        if (user.profilePublicId) {
            await deleteFromCloudinary(user.profilePublicId, "image", "upload").catch(() => { });
        }

        // Save new
        user.profilePublicId = resource.public_id;
        user.profileUrl = generatePublicUrl(resource.public_id, "image", 400); // 400px optimized
        await user.save();

        res.json({ profileUrl: user.profileUrl, public_id: resource.public_id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to upload profile" });
    }
};

export const uploadCover = async (req, res) => {
    try {
        const { public_id } = req.body;
        if (!public_id) return res.status(400).json({ message: "public_id required" });

        if (!public_id.startsWith(ALLOWED_FOLDERS.COVER + "/")) {
            return res.status(400).json({ message: "Invalid folder" });
        }

        let resource;
        try {
            resource = await cloudinary.api.resource(public_id, { resource_type: "image", type: "upload" });
        } catch {
            return res.status(400).json({ message: "Image not found" });
        }

        const rules = FOLDER_RULES[ALLOWED_FOLDERS.COVER];
        if (resource.bytes > rules.max_bytes) {
            await deleteFromCloudinary(public_id, "image", "upload").catch(() => { });
            return res.status(400).json({ message: "Image too large. Max 5MB" });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(400).json({ message: "Invalid user" });

        if (user.coverPublicId) {
            await deleteFromCloudinary(user.coverPublicId, "image", "upload").catch(() => { });
        }

        user.coverPublicId = resource.public_id;
        user.coverUrl = generatePublicUrl(resource.public_id, "image", 1200);
        await user.save();

        res.json({ coverUrl: user.coverUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to upload cover" });
    }
};

export const getAnalytics = async function (req, res, next) {
    try {
        let userId = new Types.ObjectId(req.userId)
        // let result = await Post.aggregate([                  // we only add this aggreagation for total of posts views if available
        //     { $match: { userId: userId } },
        //     { $group: { _id: null, totalViews: { $sum: '$viewersCount' } } }
        // ]);
        // const viewersCount = result.length > 0 ? result[0].totalViews : 0;

        let result = await Activity.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format the result
        let totalLikes = 0;
        let totalComments = 0;
        result.forEach(item => {
            if (item._id === 'like') totalLikes = item.count;
            if (item._id === 'comment') totalComments = item.count;
        });
        res.json({ totalComments, totalLikes })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get analytics !!!' })
    }
}

export const userProfile = async function (req, res, next) {
    try {
        let { userId } = req.query;
        if (!Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'invalid Id' })
        }
        userId = new Types.ObjectId(userId)
        const [user, isFollowing] = await Promise.all([
            User.findById(userId).select("-email -password -lastPostId -viewersCount -lastViews"),
            Follow.exists({
                follower: req.userId,
                following: userId
            })
        ]);

        if (!user) {
            return res.status(400).json({ message: 'Invalid request !!!' });
        }

        await User.bulkWrite([
            {
                updateOne: {
                    filter: { _id: userId },
                    update: {
                        $pull: { lastViews: { userId: req.userId } }
                    }
                }
            },
            {
                updateOne: {
                    filter: { _id: userId },
                    update: {
                        $push: {
                            lastViews: {
                                $each: [{ userId: req.userId, date: new Date() }],
                                $position: 0,
                                $slice: 20
                            }
                        }
                    }
                }
            },
            {
                updateOne: {
                    filter: { _id: userId },
                    update: {
                        $inc: { viewersCount: 1 }
                    }
                }
            }
        ]);

        res.json({ ...user.toObject(), isFollowing: !!isFollowing });

    } catch (err) {
        console.error('Error in userProfile:', err);

        // Better error handling
        if (err.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid user ID format'
            });
        }

        res.status(500).json({
            status: 500,
            message: 'Internal server error'
        });
    }
}

export const getProfileViews = async function (req, res, next) {
    try {
        let { lastViews } = await User.findById(req.userId)
            .select('lastViews')
            .populate('lastViews.userId', 'name profileUrl job');

        if (lastViews.length > 0) {
            let followingIds = await Follow.find({ follower: req.userId }).distinct("following");
            let followingSet = new Set(followingIds.map(id => id.toString()));
            // we add filter to remove those users that doesnt exists means were deleted cause in deletion we dont check for all users and remove him from lastViews array !
            lastViews = lastViews.filter(view => view.userId !== null).map(view => ({
                ...view._doc,
                isFollowing: followingSet.has(view.userId._id.toString())
            }));
        }
        res.json({ lastViews })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: "Failed to get views !!!" })
    }

}

export const getFollowersStats = async function (req, res, next) {
    try {
        const userId = req.userId;
        const now = new Date();

        // Start of today
        const todayStart = new Date(now.setHours(0, 0, 0, 0));

        // Start of week (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Start of month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all counts in parallel
        const [total, today, week, month] = await Promise.all([
            Follow.countDocuments({ following: userId }),
            Follow.countDocuments({
                following: userId,
                createdAt: { $gte: todayStart }
            }),
            Follow.countDocuments({
                following: userId,
                createdAt: { $gte: weekStart }
            }),
            Follow.countDocuments({
                following: userId,
                createdAt: { $gte: monthStart }
            })
        ]);

        res.json({
            total,
            today,
            week,
            month
        });

    } catch (err) {
        console.log(err);
        res.status(400).json({ message: 'Failed to get status !!!' });
    }
}

export const getFollowingStats = async function (req, res, next) {
    try {
        const userId = req.userId;
        const now = new Date();

        // Start of today
        const todayStart = new Date(now.setHours(0, 0, 0, 0));

        // Start of week (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Start of month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all counts in parallel
        const [total, today, week, month] = await Promise.all([
            Follow.countDocuments({ follower: userId }),
            Follow.countDocuments({
                follower: userId,
                createdAt: { $gte: todayStart }
            }),
            Follow.countDocuments({
                follower: userId,
                createdAt: { $gte: weekStart }
            }),
            Follow.countDocuments({
                follower: userId,
                createdAt: { $gte: monthStart }
            })
        ]);

        res.json({
            total,
            today,
            week,
            month
        });

    } catch (err) {
        console.log(err);
        res.status(400).json({ message: 'Failed to laod status !!!' });
    }
}

export const getLikedPosts = async function (req, res, next) {
    try {
        const limit = 4
        const cursor = req.query.cursor;
        let userId = req.userId;
        let query = { userId, type: 'like' }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }

        let posts = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate({
                path: 'postId',
                select: '-lastViews -viewersCount',
                populate: {
                    path: 'userId',
                    select: 'profileUrl name job'
                }
            })
            .lean();                              // ← plain objects, no _doc needed

        let hasMore = posts.length > limit;
        let items = hasMore ? posts.slice(0, limit) : posts;
        let nextCursor = hasMore ? items[items.length - 1].createdAt : null;
        items = items
            .filter(item => item.postId)          // ← skip likes whose post was deleted
            .map(item => ({
                ...item,
                postId: { ...item.postId, userLiked: true },
            }));
        res.json({
            data: items,
            hasMore,
            nextCursor
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to load likes !!!' })
    }
}

export const getCommentedPosts = async function (req, res, next) {
    try {
        const limit = 4
        const cursor = req.query.cursor;
        const userId = req.userId
        let query = { userId, type: 'comment' }
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }
        }
        let posts = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate({
                path: "postId",
                select: "-lastViews -viewersCount",
                populate: {
                    path: 'userId',
                    select: "profileUrl name job"
                }
            });
        let hasMore = posts.length > limit;
        let items = hasMore ? posts.slice(0, -1) : posts;
        let nextCursor = hasMore ? items[items.length - 1].createdAt : null;
        res.json({
            data: items,
            hasMore,
            nextCursor
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get comments !!!' })
    }
}

export const deleteComment = async function (req, res, next) {
    try {
        let id = req.body.id;
        if (!id) {
            return res.status(400).json({ message: 'Invalid id !!!' })
        }
        let document = await Activity.findByIdAndDelete(id)
        if (document == null) {
            return res.status(404).json({ message: 'Comment not found !!!' })
        }
        await Post.updateOne({ _id: document.postId }, { $inc: { comments: -1 } })
        res.json({ message: 'success' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to delete comment !!!' })
    }


}

export const postEditComment = async function (req, res, next) {
    try {
        let activityId = req.body.id;
        let comment = req.body.comment;
        if (comment) comment = comment.trim()
        if (!activityId || !comment) return res.status(400).json({ message: 'Invalid request !!!' });
        let result = await Activity.updateOne({ _id: activityId }, {
            $set: { comment: comment }
        })
        if (result.matchedCount > 0) {
            return res.json({ message: 'success' })
        } else {
            res.status(400).json({ message: 'failed' })
        }
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to edit !!!' })
    }
}

// Backend: controllers/api/user.js or conversation.js

export const searchFollowing = async function (req, res, next) {
    try {
        const { q } = req.query; // Search query

        if (!q || q.trim().length < 1) {
            // Return recent 20 if no search query
            const recentFollowing = await Follow.find({ follower: req.userId })
                .populate({
                    path: "following",
                    select: "_id name profileUrl job"
                })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const following = recentFollowing
                .map(el => el.following)
                .filter(user => user !== null);

            return res.json({ success: true, following });
        }

        // Search by name (case-insensitive)
        const searchRegex = new RegExp(q.trim(), 'i');

        // First get all following IDs
        const followDocs = await Follow.find({ follower: req.userId })
            .select("following")
            .lean();

        const followingIds = followDocs.map(doc => doc.following);

        // Then search in User model
        const matchingUsers = await User.find({
            _id: { $in: followingIds },
            name: searchRegex
        })
            .select("_id name profileUrl job")
            .limit(30) // Limit results
            .lean();

        res.json({ success: true, following: matchingUsers });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};


export const searchUsers = async function (req, res, next) {
    try {
        const { q, createdAt, _id: lastId } = req.query;
        const ITEMS_PER_PAGE = 10;

        if (!q || q.trim().length < 1) {
            return res.json({ users: [], hasMore: false });
        }

        const userId = req.userId;
        const searchRegex = new RegExp(q.trim(), 'i');

        let [followingIds, blockedByMe, blockedMe] = await Promise.all([
            Follow.find({ follower: userId }).distinct("following"),
            Block.find({ blocker: userId }).distinct("blocked"),
            Block.find({ blocked: userId }).distinct("blocker")
        ]);

        const excludedIds = [userId, ...followingIds, ...blockedByMe, ...blockedMe];

        let query = {
            _id: { $nin: excludedIds },
            name: searchRegex
        };

        if (createdAt && lastId) {
            const cursorDate = new Date(createdAt);
            const cursorId = new Types.ObjectId(lastId);
            query.$or = [
                { createdAt: { $lt: cursorDate } },
                { createdAt: cursorDate, _id: { $lt: cursorId } }
            ];
        }

        let users = await User.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(ITEMS_PER_PAGE + 1)
            .select("_id name job gender city country coverUrl profileUrl createdAt")
            .lean();

        let hasMore = false;
        if (users.length > ITEMS_PER_PAGE) {
            hasMore = true;
            users = users.slice(0, ITEMS_PER_PAGE);
        }

        res.json({ users, hasMore });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Search failed" });
    }
};

export const searchUsersForChat = async function (req, res, next) {
    try {
        const { q, createdAt, _id: lastId } = req.query;
        const ITEMS_PER_PAGE = 10;

        if (!q || q.trim().length < 1) {
            return res.json({ users: [], hasMore: false });
        }

        const userId = req.userId;
        const searchRegex = new RegExp(q.trim(), 'i');

        // Only exclude blocked users and self (NOT following)
        let [blockedByMe, blockedMe] = await Promise.all([
            Block.find({ blocker: userId }).distinct("blocked"),
            Block.find({ blocked: userId }).distinct("blocker")
        ]);

        const excludedIds = [userId, ...blockedByMe, ...blockedMe];

        let query = {
            _id: { $nin: excludedIds },
            name: searchRegex
        };

        if (createdAt && lastId) {
            const cursorDate = new Date(createdAt);
            const cursorId = new Types.ObjectId(lastId);
            query.$or = [
                { createdAt: { $lt: cursorDate } },
                { createdAt: cursorDate, _id: { $lt: cursorId } }
            ];
        }

        let users = await User.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(ITEMS_PER_PAGE + 1)
            .select("_id name job profileUrl createdAt")
            .lean();

        let hasMore = false;
        if (users.length > ITEMS_PER_PAGE) {
            hasMore = true;
            users = users.slice(0, ITEMS_PER_PAGE);
        }

        res.json({ success: true, users, hasMore });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Search failed" });
    }
};
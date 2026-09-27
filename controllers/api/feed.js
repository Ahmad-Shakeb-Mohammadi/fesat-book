import Post from "../../models/Post.js";
import User from "../../models/User.js";
import Block from "../../models/Block.js";
import Follow from "../../models/Follow.js";
import Activity from "../../models/Activity.js"
import { Types } from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { FOLDER_RULES, ALLOWED_FOLDERS, deleteFromCloudinary } from "../../services/cloudinaryService.js";

export const getPosts = async function (req, res, next) {
    try {
        const ITEMS_PER_PAGE = 7
        let userId = req.userId
        let hasNewFollowing = false;
        let hasOldFollowing = false;
        let user = await User.findById(userId).select("lastSeen")
        let lastSeen = user.lastSeen;
        let followingIds = await Follow.find({ follower: userId }).distinct("following")
        let followingSet = new Set(followingIds.map(e => e.toString()))

        let query = {
            userId: { $in: followingIds },
            createdAt: { $gt: lastSeen.date }
        };

        if (lastSeen.lastCreatedAt) {
            query = {
                userId: { $in: followingIds },
                $or: [
                    { createdAt: { $gt: lastSeen.lastCreatedAt } },
                    {
                        createdAt: lastSeen.lastCreatedAt,
                        _id: { $gt: lastSeen.lastPostId }
                    }
                ]
            };
        }
        let followingNewPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).populate("userId", "_id name job profileUrl").lean()
        if (followingNewPosts.length > ITEMS_PER_PAGE) {
            hasNewFollowing = true;
            followingNewPosts = followingNewPosts.slice(0, ITEMS_PER_PAGE)
        }
        let suggestedPosts = []
        if (followingNewPosts.length == 0) {
            let [blockedByMe, blockedMe] = await Promise.all([
                Block.find({ blocker: userId }).distinct("blocked"),
                Block.find({ blocked: userId }).distinct("blocker")
            ])
            let excludedIds = [userId, ...blockedByMe, ...blockedMe]
            let query = {
                userId: { $nin: excludedIds },
            };
            suggestedPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE).populate("userId", "_id name job profileUrl").lean()
        }
        query = {
            userId: { $in: followingIds },
            createdAt: { $lt: lastSeen.date }
        }
        if (followingNewPosts.length > 0) {
            let newIds = followingNewPosts.map(el => el._id)
            query._id = { $nin: newIds }
        } else if (suggestedPosts.length > 0) {
            let newIds = suggestedPosts.map(el => el._id)
            query._id = { $nin: newIds }
        }
        let followingOldPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).populate("userId", "_id name job profileUrl").lean()
        if (followingOldPosts.length > ITEMS_PER_PAGE) {
            hasOldFollowing = true;
            followingOldPosts = followingOldPosts.slice(0, ITEMS_PER_PAGE)
        }

        let postIds = [...followingNewPosts, ...followingOldPosts, ...suggestedPosts].map(post => post._id)
        let userLikes = await Activity.find({
            userId: req.userId,
            postId: { $in: postIds },
            type: 'like'
        }).distinct('postId')
        let likedPostIds = new Set(userLikes.map(id => id.toString()))
        followingNewPosts = followingNewPosts.map(p => ({
            ...p,
            isFollowing: followingSet.has(p.userId._id.toString()),
            userLiked: likedPostIds.has(p._id.toString())
        }))
        followingOldPosts = followingOldPosts.map(p => ({
            ...p,
            isFollowing: followingSet.has(p.userId._id.toString()),
            userLiked: likedPostIds.has(p._id.toString())
        }))
        suggestedPosts = suggestedPosts.map(p => ({
            ...p,
            isFollowing: followingSet.has(p.userId._id.toString()),
            userLiked: likedPostIds.has(p._id.toString())
        }))
        res.json({ followingNewPosts, followingOldPosts, suggestedPosts, hasNewFollowing, hasOldFollowing })

    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get Posts' })
    }

}

export const getMoreNewFollowingPosts = async function (req, res, next) {
    try {
        const ITEMS_PER_PAGE = 7
        const userId = req.userId;
        let createdAt = req.query.createdAt;
        let postId = req.query.postId;
        let hasNewFollowing = false;
        let [user, followingIds] = await Promise.all([
            await User.findById(userId).select("lastSeen"),
            await Follow.find({ follower: userId }).distinct("following")
        ])
        let lastSeen = user.lastSeen;
        let followingSet = new Set(followingIds.map(e => e.toString()))
        let query = {
            userId: { $in: followingIds },
            createdAt: { $gt: lastSeen.date }
        };
        if (createdAt && postId) {
            const cursorDate = new Date(createdAt);
            const cursorObjectId = new Types.ObjectId(postId)
            query = {
                userId: { $in: followingIds },
                $and: [
                    { createdAt: { $gt: lastSeen.date } },
                    {
                        $or: [
                            { createdAt: { $gt: cursorDate } },
                            {
                                createdAt: cursorDate,
                                _id: { $gt: cursorObjectId }
                            }
                        ]
                    }
                ]
            };
        } else if (lastSeen.lastCreatedAt) {    // this is just an edge case not normally happening
            query = {
                userId: { $in: followingIds },
                $or: [
                    { createdAt: { $gt: lastSeen.lastCreatedAt } },
                    {
                        createdAt: lastSeen.lastCreatedAt,
                        _id: { $gt: lastSeen.lastPostId }
                    }
                ]
            };
        }
        let followingNewPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).populate("userId", "_id name job profileUrl").lean()
        if (followingNewPosts.length > ITEMS_PER_PAGE) {
            followingNewPosts = followingNewPosts.slice(0, ITEMS_PER_PAGE)
            hasNewFollowing = true
        }
        if (followingNewPosts.length > 0) {
            const last = followingNewPosts[followingNewPosts.length - 1];
            let postIds = followingNewPosts.map(post => post._id)
            let [, userLikes] = await Promise.all([
                User.updateOne(
                    { _id: userId },
                    {
                        $set: {
                            'lastSeen.lastPostId': last._id,
                            'lastSeen.lastCreatedAt': last.createdAt
                        }
                    }
                ),
                Activity.find({
                    userId: req.userId,
                    postId: { $in: postIds },
                    type: 'like'
                }).distinct('postId')
            ])
            let likedPostIds = new Set(userLikes.map(id => id.toString()))
            followingNewPosts = followingNewPosts.map(p => ({
                ...p,
                isFollowing: followingSet.has(p.userId._id.toString()),
                userLiked: likedPostIds.has(p._id.toString())
            }))
        }
        res.json({ followingNewPosts, hasNewFollowing })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Faile to get more new following posts !!!' })
    }

}

export const postDismissNewFollowingPosts = async function (req, res, next) {
    try {
        let userId = req.userId
        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    "lastSeen.date": new Date(),
                    "lastSeen.lastCreatedAt": null,
                    "lastSeen.lastPostId": null
                }
            }
        )
        res.json({ message: 'success' })
    } catch (err) {
        res.status(400).json({ message: 'Failed to dissmiss new following posts !!!' })
        console.log(err)
    }
}

export const getMoreOldFollowingPosts = async function (req, res, next) {
    try {
        const userId = req.userId;
        const ITEMS_PER_PAGE = 7
        let lastCreatedAt = req.query.lastCreatedAt || null;
        let lastPostId = req.query.lastPostId || null;
        let hasOldFollowing = false;
        let followingOldPosts = [];
        if (lastCreatedAt && lastPostId) {
            lastCreatedAt = new Date(lastCreatedAt)
            lastPostId = new Types.ObjectId(lastPostId)
            let followingIds = await Follow.find({ follower: userId }).distinct("following")
            let followingSet = new Set(followingIds.map(e => e.toString()))
            let query = {
                userId: { $in: followingIds },
                $or: [
                    { createdAt: { $lt: lastCreatedAt } },
                    {
                        createdAt: lastCreatedAt,
                        _id: { $lt: lastPostId }
                    }
                ]
            };
            followingOldPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).populate("userId", "_id name job profileUrl").lean()
            if (followingOldPosts.length > ITEMS_PER_PAGE) {
                followingOldPosts = followingOldPosts.slice(0, ITEMS_PER_PAGE)
                hasOldFollowing = true;
            }
            if (followingOldPosts.length > 0) {
                let postIds = followingOldPosts.map(post => post._id)
                let userLikes = await Activity.find({
                    userId: req.userId,
                    postId: { $in: postIds },
                    type: 'like'
                }).distinct('postId')
                let likedPostIds = new Set(userLikes.map(id => id.toString()))
                followingOldPosts = followingOldPosts.map(p => ({
                    ...p,
                    isFollowing: followingSet.has(p.userId._id.toString()),
                    userLiked: likedPostIds.has(p._id.toString())
                }))
            }
        }
        res.json({ followingOldPosts, hasOldFollowing })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: err.message })
    }

}

export const getMoreSuggestedPosts = async function (req, res, next) {
    try {
        let userId = req.userId
        let createdAt = req.query.createdAt
        let postId = req.query.postId
        let ITEMS_PER_PAGE = 7
        let [blockedByMe, blockedMe, followingIds] = await Promise.all([
            Block.find({ blocker: userId }).distinct("blocked"),
            Block.find({ blocked: userId }).distinct("blocker"),
            Follow.find({ follower: userId }).distinct("following")
        ])
        let followingSet = new Set(followingIds.map(e => e.toString()))
        let excludedIds = [userId, ...blockedByMe, ...blockedMe]
        let query;
        if (createdAt && postId) {
            createdAt = new Date(createdAt)
            postId = new Types.ObjectId(postId)
            query = {
                userId: { $nin: excludedIds },
                $or: [
                    { createdAt: { $lt: createdAt } },
                    {
                        createdAt: createdAt,
                        _id: { $lt: postId }
                    }
                ]
            }
        } else {
            query = { userId: { $nin: excludedIds } }
        }

        let suggestedPosts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE).populate("userId", "_id name job profileUrl").lean()
        let postIds = suggestedPosts.map(post => post._id)
        let userLikes = await Activity.find({
            userId: userId,
            postId: { $in: postIds },
            type: 'like'
        }).distinct('postId')
        let likedPostIds = new Set(userLikes.map(id => id.toString()))
        suggestedPosts = suggestedPosts.map(p => ({
            ...p,
            isFollowing: followingSet.has(p.userId._id.toString()),
            userLiked: likedPostIds.has(p._id.toString())
        }))
        res.json({ suggestedPosts })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get new suggested posts !!!' })
    }
}

export const getUserPosts = async function (req, res, next) {
    try {
        let ITEMS_PER_PAGE = 5;
        let userId = req.query.userId || null;
        let lastCreatedAt = req.query.createdAt || null;
        let lastPostId = req.query.postId || null;
        let hasMore = false;
        let query;
        if (userId) {
            query = { userId }
            if (!lastCreatedAt && !lastPostId) {
                ITEMS_PER_PAGE = 1;
            }
        } else {
            query = { userId: req.userId }
        }
        if (lastCreatedAt && lastPostId) {
            lastCreatedAt = new Date(lastCreatedAt)
            lastPostId = new Types.ObjectId(lastPostId)
            query.$or = [
                { createdAt: { $lt: lastCreatedAt } },
                {
                    createdAt: lastCreatedAt,
                    _id: { $lt: lastPostId }
                }
            ]
        }
        let posts = await Post.find(query).sort({ createdAt: -1, _id: -1 }).limit(ITEMS_PER_PAGE + 1).lean()
        if (posts.length > ITEMS_PER_PAGE) {
            posts = posts.slice(0, ITEMS_PER_PAGE)
            hasMore = true;
        }
        if (posts.length > 0) {
            let postIds = posts.map(post => post._id)
            let userLikes = await Activity.find({
                userId: req.userId,
                postId: { $in: postIds },
                type: 'like'
            }).distinct('postId')
            let likedPostIds = new Set(userLikes.map(id => id.toString()))
            posts = posts.map(p => ({
                ...p,
                userLiked: likedPostIds.has(p._id.toString())
            }))
        }

        res.json({ posts, hasMore })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get posts !!!' })
    }

}

function cleanupPostMediaInBackground(public_id, resource_type = "image") {
    if (!public_id) return;
    const folder = public_id.split('/').slice(0, -1).join('/');
    const rules = FOLDER_RULES[folder];
    if (!rules) return;
    deleteFromCloudinary(public_id, rules.resource_type, "upload").catch(() => { });
}

export const postPost = async (req, res) => {
    try {
        let { caption, public_id } = req.body;
        if (caption) caption = caption.replace(/\r\n/g, '\n').trim();
        if (!caption || caption.length < 2 || caption.length > 2000) {
            if (public_id) cleanupPostMediaInBackground(public_id);
            return res.status(400).json({ message: 'Caption 2-2000 chars' });
        }

        let mediaUrl = null, mediaPublicId = null, mediaType = null, mediaResourceType = null;

        if (public_id) {
            const isImage = public_id.startsWith(ALLOWED_FOLDERS.POST_IMAGE + "/");
            const isVideo = public_id.startsWith(ALLOWED_FOLDERS.POST_VIDEO + "/");
            if (!isImage && !isVideo) {
                cleanupPostMediaInBackground(public_id);
                return res.status(400).json({ message: "Invalid folder" });
            }
            const expectedFolder = isImage ? ALLOWED_FOLDERS.POST_IMAGE : ALLOWED_FOLDERS.POST_VIDEO;
            const rules = FOLDER_RULES[expectedFolder];
            let resource;
            try {
                resource = await cloudinary.api.resource(public_id, { resource_type: rules.resource_type, type: "upload" });
            } catch {
                cleanupPostMediaInBackground(public_id);
                return res.status(400).json({ message: "Media not found" });
            }
            if (resource.bytes > rules.max_bytes) {
                cleanupPostMediaInBackground(public_id);
                return res.status(400).json({ message: "Too large" });
            }
            mediaPublicId = resource.public_id;
            mediaResourceType = resource.resource_type;
            mediaType = resource.resource_type === "video" ? "video" : "image";
            mediaUrl = resource.secure_url;
        }

        let newPost = new Post({ caption, mediaUrl, mediaPublicId, mediaType, mediaResourceType, userId: req.userId });
        newPost = await newPost.save();
        await newPost.populate('userId', '_id name profileUrl job');
        await User.updateOne({ _id: req.userId }, { $inc: { postCount: 1 } });
        res.status(200).json({ post: newPost });

    } catch (err) {
        console.error(err);
        if (req.body?.public_id) cleanupPostMediaInBackground(req.body.public_id);
        res.status(400).json({ message: "Failed to create post" });
    }
};

export const editPost = async (req, res) => {
    try {
        let { caption, postId, public_id, check } = req.body;
        if (caption) caption = caption.replace(/\r\n/g, '\n').trim();
        if (!caption || caption.length < 2 || caption.length > 2000) {
            if (public_id) cleanupPostMediaInBackground(public_id);
            return res.status(400).json({ message: 'Caption 2-2000 chars' });
        }
        let post = await Post.findOne({ _id: postId, userId: req.userId });
        if (!post) {
            if (public_id) cleanupPostMediaInBackground(public_id);
            return res.status(400).json({ message: 'Invalid post' });
        }

        let newMediaUrl = post.mediaUrl;
        let newMediaPublicId = post.mediaPublicId;
        let newMediaType = post.mediaType;
        let newMediaResourceType = post.mediaResourceType;
        const shouldRemove = check === true || check === "true";
        let oldPublicIdToDelete = null;

        if (public_id || shouldRemove) {
            if (post.mediaPublicId) oldPublicIdToDelete = post.mediaPublicId;

            if (public_id) {
                const isImage = public_id.startsWith(ALLOWED_FOLDERS.POST_IMAGE + "/");
                const isVideo = public_id.startsWith(ALLOWED_FOLDERS.POST_VIDEO + "/");
                if (!isImage && !isVideo) {
                    cleanupPostMediaInBackground(public_id);
                    return res.status(400).json({ message: "Invalid folder" });
                }
                const expectedFolder = isImage ? ALLOWED_FOLDERS.POST_IMAGE : ALLOWED_FOLDERS.POST_VIDEO;
                const rules = FOLDER_RULES[expectedFolder];
                let resource;
                try {
                    resource = await cloudinary.api.resource(public_id, { resource_type: rules.resource_type, type: "upload" });
                } catch {
                    cleanupPostMediaInBackground(public_id);
                    return res.status(400).json({ message: "Media not found" });
                }
                if (resource.bytes > rules.max_bytes) {
                    cleanupPostMediaInBackground(public_id);
                    return res.status(400).json({ message: "Too large" });
                }
                newMediaPublicId = resource.public_id;
                newMediaResourceType = resource.resource_type;
                newMediaType = resource.resource_type === "video" ? "video" : "image";
                newMediaUrl = resource.secure_url;
            } else {
                newMediaUrl = null; newMediaPublicId = null; newMediaType = null; newMediaResourceType = null;
            }
        }

        post.caption = caption;
        post.mediaUrl = newMediaUrl;
        post.mediaPublicId = newMediaPublicId;
        post.mediaType = newMediaType;
        post.mediaResourceType = newMediaResourceType;
        await post.save();

        res.json({ message: 'Post updated' });

        // Background delete old media after response - non-blocking
        if (oldPublicIdToDelete) {
            const oldRules = FOLDER_RULES[oldPublicIdToDelete.split('/').slice(0, -1).join('/')];
            if (oldRules) deleteFromCloudinary(oldPublicIdToDelete, oldRules.resource_type, "upload").catch(() => { });
            else deleteFromCloudinary(oldPublicIdToDelete, post.mediaResourceType || "image", "upload").catch(() => { });
        }

    } catch (err) {
        console.error(err);
        if (req.body?.public_id) cleanupPostMediaInBackground(req.body.public_id);
        res.status(400).json({ message: "Failed to edit post" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { postId } = req.body;
        const post = await Post.findOne({ _id: postId, userId: req.userId });
        if (!post) return res.status(400).json({ message: 'Invalid post' });

        await post.deleteOne();
        await Activity.deleteMany({ postId });
        if (post.mediaPublicId) {
            deleteFromCloudinary(post.mediaPublicId, post.mediaResourceType || "image", "upload").catch(() => { });
        }
        await User.updateOne({ _id: req.userId }, { $inc: { postCount: -1 } });
        res.json({ message: 'successful' });
    } catch (err) {
        res.status(400).json({ message: 'Failed to delete' });
    }
};

export const getComments = async function (req, res, next) {
    try {
        let ITEMS_PER_PAGE = 7;
        let postId = req.params.postId;
        let cursor = req.query.lastId;
        if (!postId) {
            return res.status(400).json({ message: 'No Post Found!' })
        }
        let query = { postId, type: 'comment' }
        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) }
        }
        let comments = await Activity.find(query).sort({ createdAt: -1 }).limit(ITEMS_PER_PAGE + 1).select("_id userId comment").populate('userId', '_id name job profileUrl').lean()
        let hasMore = comments.length > ITEMS_PER_PAGE;
        comments = hasMore ? comments.slice(0, ITEMS_PER_PAGE) : comments;
        let lastId = comments.length > 0 ? comments[comments.length - 1]._id : null;
        res.json({ comments, hasMore, lastId })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get comments' })
    }

}

export const postComment = async function (req, res, next) {
    try {
        let postId = req.body.postId
        let comment = req.body.comment
        if (comment) comment = comment.trim();
        if (!postId || !comment || comment.length == 0) {
            return res.status(400).json({ message: 'comment length is less than 1' })
        }
        let post = await Post.findById(postId)
        if (!post) {
            return res.status(400).json({ message: "Post doesn't exist!" })
        }
        let isBlocked = await Block.findOne({ blocker: post.userId, blocked: req.userId })
        if (isBlocked) {
            return res.status(400).json({ message: "Blocked users can't comment!" })
        }
        await Activity.create({
            userId: req.userId,
            postId: postId,
            type: 'comment',
            comment: comment
        })
        post.comments += 1;
        await post.save()
        res.status(200).json({ message: 'Comment added successfully' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ status: 400 })
    }

}

export const postLike = async function (req, res, next) {
    try {
        const postId = req.body.postId;
        if (!postId) {
            return res.status(400).json({ message: 'no postId' })
        }
        let post = await Post.findById(postId)
        if (!post) {
            return res.status(400).json({ message: "Post doesn't exist !" })
        }
        let isBlocked = await Block.findOne({ blocker: post.userId, blocked: req.userId })
        if (isBlocked) {
            return res.status(400).json({ message: "Blocked Contacts can't like!" })
        }
        let activity = await Activity.findOne({ postId, userId: req.userId, type: 'like' })
        if (!activity) {
            await Activity.create({
                userId: req.userId,
                postId,
                type: 'like'
            })
            post.likes += 1;
        } else {
            await activity.deleteOne()
            post.likes -= 1;
        }
        await post.save()
        res.json({ message: 'successful' })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to post Like!' })
    }
}

export const getLike = async function (req, res, next) {
    try {
        let ITEMS_PER_PAGE = 18;
        const postId = req.params.postId;
        const cursor = req.query.lastId;
        if (!postId) {
            return res.status(400).json({ message: 'no postId' })
        }
        let query = { postId, type: 'like' }
        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) }
        }
        let likes = await Activity.find(query).sort({ createdAt: -1 }).limit(ITEMS_PER_PAGE + 1).select("_id userId like").populate('userId', '_id profileUrl name').lean()
        let hasMore = likes.length > ITEMS_PER_PAGE;
        likes = hasMore ? likes.slice(0, ITEMS_PER_PAGE) : likes;
        let lastId = likes.length > 0 ? likes[likes.length - 1]._id : null;
        res.json({ likes, hasMore, lastId })
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get likes' })
    }

}

export const getSinglePost = async function (req, res, next) {
    try {
        const postId = req.params.postId
        if (!postId) {
            return res.status(400).json({ message: 'No post id provided!' })
        }
        let post = await Post.findOne({ _id: postId, userId: req.userId })
        if (!post) {
            return res.status(400).json({ message: 'Invalid post id!' })
        }
        return res.json(post)
    } catch (err) {
        console.log(err)
        res.status(400).json({ message: 'Failed to get post' })
    }

}



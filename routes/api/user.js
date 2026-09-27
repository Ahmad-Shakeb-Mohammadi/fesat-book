import express from "express";
const router = express.Router();
import * as userController from "../../controllers/api/user.js";

router.get("/user", userController.getUser)

router.post("/follow", userController.postFollow)

router.get("/users", userController.getUsers)

router.get("/user/following", userController.getFollowing)

router.post("/user/unfollow", userController.postUnfollow)

router.get("/user/follower", userController.getFollower)

router.post("/user/block", userController.postBlock)

router.post("/user/upload-cover", userController.uploadCover)

router.post("/user/upload-profile", userController.uploadProfile)

router.get("/getAnalytics", userController.getAnalytics)

router.get("/userProfile", userController.userProfile)

router.get("/profile-views", userController.getProfileViews)

router.get("/followerStats", userController.getFollowersStats)

router.get("/followingStats", userController.getFollowingStats)

router.get("/user/likes", userController.getLikedPosts)

router.get("/user/comments", userController.getCommentedPosts)

router.post("/user/deleteComment", userController.deleteComment)

router.post("/user/editComment", userController.postEditComment)

router.get("/chat/search-following", userController.searchFollowing)

router.get("/users/search", userController.searchUsers)

router.get("/chat/search-users", userController.searchUsersForChat)

export default router;
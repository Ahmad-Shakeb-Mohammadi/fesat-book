import express from "express";
import * as feedController from "../../controllers/api/feed.js";
const router = express.Router();


router.get("/posts", feedController.getPosts)

router.get("/newFollowingPosts", feedController.getMoreNewFollowingPosts)

router.post("/dismissNewFollowingPosts", feedController.postDismissNewFollowingPosts)

router.get("/oldFollowingPosts", feedController.getMoreOldFollowingPosts)

router.get("/suggestedPosts", feedController.getMoreSuggestedPosts)

router.get("/userPosts", feedController.getUserPosts)

router.post("/post", feedController.postPost)

router.get("/comments/:postId", feedController.getComments)

router.post("/postComment", feedController.postComment)

router.post("/post/like", feedController.postLike)

router.get("/like/:postId", feedController.getLike)

router.get("/post/:postId", feedController.getSinglePost)

router.post("/editPost", feedController.editPost)

router.post("/deletePost", feedController.deletePost)

export default router;
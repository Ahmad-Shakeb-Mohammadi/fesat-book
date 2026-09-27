import { validationResult } from "express-validator"
import User from "../models/User.js";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import RefreshToken from "../models/RefreshToken.js";
import crypto from "node:crypto";
import cloudinary from "../config/cloudinary.js";
import { ALLOWED_FOLDERS, FOLDER_RULES, deleteFromCloudinary, generatePublicUrl } from "../services/cloudinaryService.js";

export const postSignUp = async function (req, res, next) {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const country = req.body.country;
    const city = req.body.city;
    let job = req.body.job;
    if (job) job = job.trim();
    let gender = req.body.gender;
    let public_id = req.body.public_id; // NEW: from Cloudinary direct upload

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (public_id) await deleteFromCloudinary(public_id, "image", "upload").catch(() => { });
        return res.status(400).json({ message: errors.array()[0].msg });
    }

    let foundedUser = await User.findOne({ email });
    if (foundedUser) {
        if (public_id) await deleteFromCloudinary(public_id, "image", "upload").catch(() => { });
        return res.status(400).json({ message: 'Email has already been taken!' });
    }

    let profileUrl = null;
    let profilePublicId = null;

    if (public_id) {
        if (!public_id.startsWith(ALLOWED_FOLDERS.PROFILE + "/")) {
            return res.status(400).json({ message: 'Invalid image folder' });
        }
        let resource;
        try {
            resource = await cloudinary.api.resource(public_id, { resource_type: "image", type: "upload" });
        } catch {
            return res.status(400).json({ message: 'Profile image not found' });
        }
        const rules = FOLDER_RULES[ALLOWED_FOLDERS.PROFILE];
        if (resource.bytes > rules.max_bytes) {
            await deleteFromCloudinary(public_id, "image", "upload").catch(() => { });
            return res.status(400).json({ message: 'Profile max 5MB' });
        }
        profilePublicId = resource.public_id;
        profileUrl = generatePublicUrl(resource.public_id, "image", 400);
    }else {
        profileUrl = "/images/default-profile.png"
    }

    let hashedPassword = await bcrypt.hash(password, 10);
    let newUser;
    if (job) {
        newUser = new User({ email, password: hashedPassword, name, country, city, gender, profileUrl, profilePublicId, job });
    } else {
        newUser = new User({ email, password: hashedPassword, name, country, city, gender, profileUrl, profilePublicId });
    }
    await newUser.save();

    res.status(201).json({ message: 'Account created successfully!' });
}


export const postLogin = async function (req, res, next) {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg })
    }

    let foundedUser = await User.findOne({ email })
    if (!foundedUser) {
        return res.status(401).json({ message: "Wrong Credentials!" })
    }

    let isEqual = await bcrypt.compare(password, foundedUser.password)
    if (!isEqual) {
        return res.status(401).json({ message: "Wrong Credentials!" })
    }

    // Generate Access Token (15 minutes)
    const accessToken = jwt.sign(
        { userId: foundedUser._id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    )

    // Generate Refresh Token (opaque random string)
    const refreshTokenString = crypto.randomBytes(32).toString('hex')

    // Save Refresh Token to DB (expires in 7 days)
    const refreshToken = new RefreshToken({
        userId: foundedUser._id,
        token: refreshTokenString,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    })
    await refreshToken.save()

    // Set Refresh Token as httpOnly cookie
    res.cookie('refreshToken', refreshTokenString, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    // Return Access Token + User Data as JSON
    res.status(200).json({
        accessToken,
        user: {
            id: foundedUser._id,
            email: foundedUser.email,
            name: foundedUser.name,
            profileUrl: foundedUser.profileUrl,
            coverUrl: foundedUser.coverUrl,
            country: foundedUser.country,
            city: foundedUser.city,
            job: foundedUser.job,
            gender: foundedUser.gender,
            followingCount: foundedUser.followingCount,
            followerCount: foundedUser.followerCount,
            postCount: foundedUser.postCount
        }
    })
}

export const postRefresh = async function (req, res, next) {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
        return res.status(401).json({ message: "No refresh token" })
    }

    // Find refresh token in DB
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken })

    if (!tokenDoc) {
        return res.status(401).json({ message: "Invalid refresh token" })
    }

    // Check if expired
    if (tokenDoc.expiresAt < new Date()) {
        await RefreshToken.deleteOne({ _id: tokenDoc._id })
        return res.status(401).json({ message: "Refresh token expired" })
    }

    // Generate new access token
    const accessToken = jwt.sign(
        { userId: tokenDoc.userId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    )

    res.status(200).json({ accessToken })
}

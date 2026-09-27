import cloudinary from "../config/cloudinary.js";

export const ALLOWED_FOLDERS = {
    PROFILE: "social-app/profiles",
    COVER: "social-app/covers",
    POST_IMAGE: "social-app/posts/images",
    POST_VIDEO: "social-app/posts/videos",
    CHAT_IMAGE: "social-app/chat/images",
    CHAT_VIDEO: "social-app/chat/videos",
    CHAT_FILE: "social-app/chat/files",
    GROUP_IMAGE: "social-app/groups/images",
};

export const FOLDER_RULES = {
    [ALLOWED_FOLDERS.PROFILE]: {
        resource_type: "image",
        type: "upload",
        allowed_formats: ["jpg", "jpeg", "png"],
        max_bytes: 5 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.COVER]: {
        resource_type: "image",
        type: "upload",
        allowed_formats: ["jpg", "jpeg", "png"],
        max_bytes: 5 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.POST_IMAGE]: {
        resource_type: "image",
        type: "upload",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        max_bytes: 5 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.POST_VIDEO]: {
        resource_type: "video",
        type: "upload",
        allowed_formats: ["mp4", "webm", "mov", "mpeg", "qt"],
        max_bytes: 50 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.CHAT_IMAGE]: {
        resource_type: "image",
        type: "authenticated",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        max_bytes: 9 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.CHAT_VIDEO]: {
        resource_type: "video",
        type: "authenticated",
        allowed_formats: ["mp4", "webm", "mov"],
        max_bytes: 9 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.CHAT_FILE]: {
        resource_type: "raw",
        type: "authenticated",
        allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "json", "zip"],
        max_bytes: 9 * 1024 * 1024,
    },
    [ALLOWED_FOLDERS.GROUP_IMAGE]: {
        resource_type: "image",
        type: "upload",
        allowed_formats: ["jpg", "jpeg", "png"],
        max_bytes: 5 * 1024 * 1024,
    },
};

export const CHAT_PREVIEW_FORMATS = new Set(["pdf", "txt", "csv", "json"]);
export const CHAT_DOWNLOAD_FORMATS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip"]);

function sanitizeDownloadFilename(filename, fallbackFormat = "bin") {
    const fallback = `file.${fallbackFormat}`;
    if (typeof filename !== "string" || !filename.trim()) {
        return fallback;
    }
    // Never allow path separators or characters that can interfere with Cloudinary's transformation syntax.
    const safe = filename.trim().replace(/[\/\\?%*:|"<>]/g, "_").replace(/[\r\n]/g, "_").replace(/\s+/g, "_").slice(0, 180);
    return safe || fallback;
}

export function generateUploadSignature(folder) {
    if (!Object.values(ALLOWED_FOLDERS).includes(folder)) {
        throw new Error("Invalid folder");
    }
    const rules = FOLDER_RULES[folder];
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        timestamp,
        folder,
        type: rules.type,
        allowed_formats: rules.allowed_formats.join(","),
        use_filename: true,
        unique_filename: true,
        overwrite: false,
    };
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
    const uploadResourceType = rules.resource_type === "raw" ? "raw" : rules.resource_type;
    return {
        timestamp,
        signature,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
        type: rules.type,
        allowed_formats: rules.allowed_formats,
        max_bytes: rules.max_bytes,
        resource_type: rules.resource_type,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${rules.resource_type}/upload`,
    };
}

// Signed delivery URL for authenticated assets. Used for: authenticated images, authenticated videos, raw file previews.
export function generateAuthenticatedUrl(publicId, resourceType) {
    if (!publicId) {
        throw new Error("publicId is required");
    }
    if (!["image", "video", "raw"].includes(resourceType)) {
        throw new Error("Invalid resource type");
    }
    return cloudinary.url(publicId, {
        resource_type: resourceType,
        type: "authenticated",
        secure: true,
        sign_url: true,
    });
}

// Signed authenticated CDN URL which forces the browser to download the file. Important: The URL is authenticated/signed, but like any signed Cloudinary delivery URL, possession of the URL itself permits access until the asset is removed or renamed.
export function generateAuthenticatedDownloadUrl(publicId, originalName, format) {
    if (!publicId) throw new Error("publicId is required");
    // Don't put filename in flag - dot breaks transformation parsing
    return cloudinary.url(publicId, {
        resource_type: "raw",
        type: "authenticated",
        secure: true,
        sign_url: true,
        flags: "attachment", // FIX: no :filename, just attachment
    });
}

export function generatePublicUrl(public_id, resource_type = "image", width = null) {
    if (!public_id) {
        throw new Error("public_id is required");
    }
    if (resource_type === "video") {
        return cloudinary.url(public_id, {
            type: "upload",
            resource_type: "video",
            secure: true,
            format: "mp4",
            transformation: [
                {
                    quality: "auto",
                    video_codec: "auto",
                    flags: "faststart",
                },
            ],
        });
    }
    const transformation = [
        {
            fetch_format: "auto",
            quality: "auto",
        },
    ];
    if (width) {
        transformation[0].width = width;
    }
    return cloudinary.url(public_id, {
        type: "upload",
        resource_type,
        secure: true,
        transformation,
    });
}

export async function deleteFromCloudinary(public_id, resource_type = "image", type = "upload") {
    return cloudinary.uploader.destroy(public_id, {
        resource_type,
        type,
        invalidate: true,
    });
}

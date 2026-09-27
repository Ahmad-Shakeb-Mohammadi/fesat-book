import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";

import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";

import {
  CHAT_PREVIEW_FORMATS,
  CHAT_DOWNLOAD_FORMATS,
  FOLDER_RULES,
  generateAuthenticatedUrl,
  generateAuthenticatedDownloadUrl,
} from "../../services/cloudinaryService.js";

export const getMediaAccess =
  async (req, res) => {
    try {
      const {
        public_id,
        resource_type,
        conversationId,
        mode = "preview",
      } = req.body;

      const userId =
        req.userId;

      if (
        !public_id ||
        !resource_type ||
        !conversationId
      ) {
        return res.status(400).json({
          message:
            "Missing fields",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          conversationId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid conversationId",
        });
      }

      if (
        !["preview", "download"].includes(
          mode
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid access mode",
        });
      }

      /*
       * 1. User must currently belong
       *    to the conversation.
       */
      const isParticipant =
        await Conversation.exists({
          _id: conversationId,
          participants: {
            $elemMatch: {
              userId,
              leftAt: null,
            },
          },
        });

      if (!isParticipant) {
        return res.status(403).json({
          message:
            "Access denied",
        });
      }

      /*
       * 2. The specific Cloudinary public_id
       *    must belong to a message in this
       *    conversation.
       *
       * 3. Respect delete-for-me and
       *    delete-for-everyone.
       */
      const message =
        await Message.findOne({
          conversationId,

          deletedForEveryoneAt:
            null,

          deletedFor: {
            $ne: userId,
          },

          "attachments.public_id":
            public_id,
        }).select(
          "attachments"
        );

      if (!message) {
        return res.status(404).json({
          message:
            "Attachment not found",
        });
      }

      /*
       * Find the exact attachment.
       */
      const attachment =
        message.attachments.find(
          (item) =>
            item.public_id ===
            public_id
        );

      if (!attachment) {
        return res.status(404).json({
          message:
            "Attachment not found",
        });
      }

      /*
       * Never trust resource_type
       * from the browser.
       */
      if (
        attachment.resource_type !==
        resource_type
      ) {
        return res.status(400).json({
          message:
            "Resource type mismatch",
        });
      }

      /*
       * Only authenticated chat media
       * may be exposed through this endpoint.
       */
      if (
        attachment.delivery_type !==
        "authenticated"
      ) {
        return res.status(403).json({
          message:
            "Attachment is not authenticated",
        });
      }

      /*
       * Validate the resource type.
       */
      if (
        ![
          "image",
          "video",
          "raw",
        ].includes(
          attachment.resource_type
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid resource type",
        });
      }

      /*
       * RAW FILES
       */
      if (
        attachment.resource_type ===
        "raw"
      ) {
        const format =
          String(
            attachment.format ||
            resource.format ||
            ""
          ).toLowerCase();

        /*
         * File must still obey the
         * application's configured rules.
         */
        const chatFileRule =
          FOLDER_RULES[
          Object.keys(
            FOLDER_RULES
          ).find(
            (folder) => {
              const rule =
                FOLDER_RULES[
                folder
                ];

              return (
                rule.resource_type ===
                "raw" &&
                rule.type ===
                "authenticated" &&
                rule.allowed_formats.includes(
                  format
                )
              );
            }
          )
          ];

        if (!chatFileRule) {
          return res.status(400).json({
            message:
              "Unsupported file format",
          });
        }

        /*
         * PREVIEW
         */
        if (
          mode === "preview"
        ) {
          if (
            !CHAT_PREVIEW_FORMATS.has(
              format
            )
          ) {
            return res.status(400).json({
              message:
                "This file is download-only",
            });
          }

          const mediaUrl =
            generateAuthenticatedUrl(
              attachment.public_id,
              "raw"
            );

          return res.json({
            success: true,
            mode: "preview",
            mediaUrl,

            attachment: {
              public_id:
                attachment.public_id,
              format,
              originalName:
                attachment.originalName,
              mimeType:
                attachment.mimeType,
              size:
                attachment.size,
            },
          });
        }

        /*
         * DOWNLOAD
         */
        if (
          !CHAT_DOWNLOAD_FORMATS.has(
            format
          )
        ) {
          return res.status(400).json({
            message:
              "This file type is not configured for download",
          });
        }

        const mediaUrl =
          generateAuthenticatedDownloadUrl(
            attachment.public_id,
            attachment.originalName,
            format
          );

        return res.json({
          success: true,
          mode: "download",
          mediaUrl,

          attachment: {
            public_id:
              attachment.public_id,
            format,
            originalName:
              attachment.originalName,
            mimeType:
              attachment.mimeType,
            size:
              attachment.size,
          },
        });
      }

      /*
       * IMAGE / VIDEO
       *
       * Existing chat media continues
       * to use normal authenticated
       * signed delivery.
       */
      if (
        mode !== "preview"
      ) {
        return res.status(400).json({
          message:
            "Images and videos do not use file download mode",
        });
      }

      const mediaUrl =
        generateAuthenticatedUrl(
          attachment.public_id,
          attachment.resource_type
        );

      return res.json({
        success: true,
        mode: "preview",
        mediaUrl,

        attachment: {
          public_id:
            attachment.public_id,
          resource_type:
            attachment.resource_type,
          format:
            attachment.format,
          originalName:
            attachment.originalName,
          mimeType:
            attachment.mimeType,
          size:
            attachment.size,
        },
      });
    } catch (err) {
      console.error(
        "getMediaAccess error:",
        err
      );

      return res.status(500).json({
        message:
          "Failed to access media",
      });
    }
  };
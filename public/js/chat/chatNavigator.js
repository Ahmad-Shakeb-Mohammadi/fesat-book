import { createOrOpenDirect } from "./chatApi.js";
import { chatState } from "./chatState.js";
import { navigateTo } from "../router.js";
import { toast } from "../utils/toast.js";

/**
 * Universal function to open a conversation with a user from anywhere in the app.
 * Handles: cache check → API call → messenger navigation → conversation open
 */
export async function navigateToConversation(userId) {
    try {
        // Step 1: Check if conversation already exists in cache (instant open if found)
        const existingConversation = chatState.conversations.find(conv =>
            conv.type === "direct" &&
            conv.participants.some(p =>
                (p.userId?._id?.toString() || p.userId?.toString()) === userId.toString()
            )
        );

        if (existingConversation) {
            // Fast path: conversation in cache, just navigate
            chatState.pendingConversationId = existingConversation._id;
            navigateTo("/messages");
            return;
        }

        // Step 2: Conversation not in cache - fetch/create from server
        const data = await createOrOpenDirect(userId);

        if (!data.success || !data.conversation) {
            throw new Error(data.message || "Failed to open conversation");
        }

        // Step 3: Add to cache if newly created
        const exists = chatState.conversations.find(c => c._id === data.conversation._id);
        if (!exists) {
            chatState.conversations.unshift(data.conversation);
        }

        // Step 4: Navigate to messenger with pending conversation
        chatState.pendingConversationId = data.conversation._id;
        navigateTo("/messages");

    } catch (error) {
        toast.error("Failed to open conversation");
    }
}
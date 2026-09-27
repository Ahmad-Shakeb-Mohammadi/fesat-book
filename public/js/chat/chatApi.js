import { apiFetch } from "../api.js";

import { chatState } from "./chatState.js";

export async function uploadChatFileToCloudinary(file, conversationId, onProgress = null, abortSignal = null) {
  let folder = "social-app/chat/files";
  if (file.type.startsWith("image/")) folder = "social-app/chat/images";
  else if (file.type.startsWith("video/")) folder = "social-app/chat/videos";

  const sig = await getChatUploadSignature(folder, conversationId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (abortSignal) abortSignal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      if (onProgress) onProgress(percent, file);
      const state = chatState.activeChatUploads[conversationId];
      if (!state) return;
      const entry = state.files.find(f => f.name === file.name && f.size === file.size);
      if (entry) entry.progress = percent;
      const total = state.files.reduce((s, f) => s + (f.progress || 0), 0) / state.files.length;
      state.totalProgress = Math.round(total);
      state.listeners.forEach(fn => fn(state));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) { reject(new Error(data.error.message)); return; }
          const state = chatState.activeChatUploads[conversationId];
          if (state) {
            const entry = state.files.find(f => f.name === file.name && f.size === file.size);
            if (entry) { entry.public_id = data.public_id; entry.status = 'done'; entry.progress = 100; }
            const total = state.files.reduce((s, f) => s + (f.progress || 0), 0) / state.files.length;
            state.totalProgress = Math.round(total);
            state.listeners.forEach(fn => fn(state));
          }
          resolve({
            public_id: data.public_id,
            folder,
            originalName: file.name,
            mimeType: file.type,
            bytes: data.bytes,
            format: data.format,
          });
        } catch (err) { reject(err); }
      } else reject(new Error(`Upload failed (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new DOMException("Cancelled", "AbortError"));

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp);
    form.append("signature", sig.signature);
    form.append("folder", sig.folder);
    form.append("type", sig.type);
    form.append("allowed_formats", sig.allowed_formats.join(","));
    form.append("use_filename", "true");
    form.append("unique_filename", "true");
    form.append("overwrite", "false");

    xhr.open("POST", sig.uploadUrl);
    xhr.send(form);
  });
}

export async function sendMediaMessage(conversationId, files, text = "", replyTo = null, onProgress = null, abortSignal = null) {
  // Parallel - 5 files at once, not sequential loop
  const uploadPromises = files.map(file =>
    uploadChatFileToCloudinary(file, conversationId, onProgress, abortSignal)
  );

  const uploaded = await Promise.all(uploadPromises);

  const res = await apiFetch(`/api/conversations/${conversationId}/messages/media/cloudinary`, {
    method: "POST",
    body: JSON.stringify({ files: uploaded, text, replyTo })
  });
  return res.json();
}

export async function getChatMediaUrl(
  public_id,
  resource_type,
  conversationId,
  mode = "preview"
) {
  const res = await apiFetch(
    "/api/media/access",
    {
      method: "POST",

      body: JSON.stringify({
        public_id,
        resource_type,
        conversationId,
        mode,
      }),
    }
  );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message ||
      "Unable to access media"
    );
  }

  if (!data?.success) {
    throw new Error(
      data?.message ||
      "Unable to access media"
    );
  }

  if (!data?.mediaUrl) {
    throw new Error(
      "No mediaUrl"
    );
  }

  return data;
}

export async function getChatUploadSignature(folder, conversationId) {
  const res = await apiFetch("/api/cloudinary/signature", {
    method: "POST",
    body: JSON.stringify({ folder, conversationId })
  });
  return res.json();
}

export async function getOnlineUsersList(signal = null) {
  const res = await apiFetch("/api/conversations/online-users", { signal });
  return res.json();
}

export async function getMyConversations(page = 1, limit = 100, signal = null) {
  const res = await apiFetch(`/api/conversations?page=${page}&limit=${limit}`, { signal });
  return res.json();
}

export async function getTotalUnreadCount() {
  const res = await apiFetch("/api/conversations/unread-count");
  return res.json();
}

export async function createOrOpenDirect(recipientId) {
  const res = await apiFetch("/api/conversations/direct", {
    method: "POST",
    body: JSON.stringify({ recipientId })
  });
  return res.json();
}

export async function createGroup(name, participantIds) {
  const res = await apiFetch("/api/conversations/group", {
    method: "POST",
    body: JSON.stringify({ name, participantIds })
  });
  return res.json();
}

// ─── Messages ─────────────────────────────────────────────────────────

export async function getMessages(conversationId, cursor = null, limit = 30, signal = null) {
  let url = `/api/conversations/${conversationId}/messages?limit=${limit}`;

  if (cursor?.beforeCreatedAt && cursor?.beforeId) {
    url += `&beforeCreatedAt=${encodeURIComponent(cursor.beforeCreatedAt)}&beforeId=${cursor.beforeId}`;
  }

  const res = await apiFetch(url, { signal });
  return res.json();
}

export async function sendTextMessage(conversationId, text, replyTo = null) {
  const body = { text };
  if (replyTo) body.replyTo = replyTo;

  const res = await apiFetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function editMessage(messageId, text) {
  const res = await apiFetch(`/api/conversations/messages/${messageId}`, {
    method: "PUT",
    body: JSON.stringify({ text })
  });
  return res.json();
}

export async function deleteForMe(messageId) {
  const res = await apiFetch(`/api/conversations/messages/${messageId}/me`, {
    method: "DELETE"
  });
  return res.json();
}

export async function deleteForEveryone(messageId) {
  const res = await apiFetch(`/api/conversations/messages/${messageId}/everyone`, {
    method: "DELETE"
  });
  return res.json();
}

// ─── Read Status ──────────────────────────────────────────────────────

export async function markAsRead(conversationId) {
  const res = await apiFetch(`/api/conversations/${conversationId}/read`, {
    method: "POST"
  });
  return res.json();
}

// ─── Group Management ─────────────────────────────────────────────────

export async function addMembersToGroup(conversationId, participantIds) {
  const res = await apiFetch(`/api/conversations/${conversationId}/members`, {
    method: "POST",
    body: JSON.stringify({ participantIds })
  });
  return res.json();
}

export async function leaveGroup(conversationId) {
  const res = await apiFetch(`/api/conversations/${conversationId}/leave`, {
    method: "POST"
  });
  return res.json();
}

/**
 * Search following for new chat modal
 */
export async function searchFollowing(query = "", signal = null) {
  const url = query
    ? `/api/chat/search-following?q=${encodeURIComponent(query)}`
    : "/api/chat/search-following";
  const res = await apiFetch(url, { signal });
  return res.json();
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId, signal = null) {
  const res = await apiFetch(`/api/conversations/${conversationId}`, { signal });
  return res.json();
}

export async function toggleMuteConversation(conversationId) {
  const res = await apiFetch(`/api/conversations/${conversationId}/mute`, {
    method: "PUT"
  });
  return res.json();
}

export async function uploadGroupImage(conversationId, imageFile) {
  // 1. Get signature for group avatar (public)
  const sig = await getChatUploadSignature("social-app/groups/images", conversationId);

  // 2. Direct to Cloudinary
  const form = new FormData();
  form.append("file", imageFile);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("type", sig.type);
  form.append("allowed_formats", sig.allowed_formats.join(","));
  form.append("use_filename", "true");
  form.append("unique_filename", "true");
  form.append("overwrite", "false");

  const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  // 3. Save public_id to your DB
  const saveRes = await apiFetch(`/api/conversations/${conversationId}/image`, {
    method: "PUT",
    body: JSON.stringify({ public_id: data.public_id })
  });
  return saveRes.json();
}

export async function removeGroupImage(conversationId) {
  const res = await apiFetch(`/api/conversations/${conversationId}/image`, {
    method: "DELETE"
  });
  return res.json();
}

export async function updateGroupName(conversationId, name) {
  const res = await apiFetch(`/api/conversations/${conversationId}/name`, {
    method: "PUT",
    body: JSON.stringify({ name })
  });
  return res.json();
}

/**
 * Search all platform users for chat (excludes only blocked, not following)
 */
export async function searchUsersForChat(query, cursor = {}, signal = null) {
  let url = `/api/chat/search-users?q=${encodeURIComponent(query)}`;
  if (cursor.createdAt && cursor._id) {
    url += `&createdAt=${encodeURIComponent(cursor.createdAt)}&_id=${cursor._id}`;
  }
  const res = await apiFetch(url, { signal });
  return res.json();
}

export async function updateMemberRole(conversationId, userId, role) {
  const res = await apiFetch(`/api/conversations/${conversationId}/members/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role })
  });
  return res.json();
}

export async function removeMember(conversationId, userId) {
  const res = await apiFetch(`/api/conversations/${conversationId}/members/${userId}/remove`, {
    method: "POST"
  });
  return res.json();
}


export async function saveChatMediaMessage(conversationId, files, text = "", replyTo = null) {
  const res = await apiFetch(`/api/conversations/${conversationId}/messages/media/cloudinary`, {
    method: "POST",
    body: JSON.stringify({ files, text, replyTo })
  });
  return res.json();
}

export async function cleanupChatUploads(public_ids) {
  const res = await apiFetch('/api/cloudinary/cleanup', {
    method: 'POST',
    body: JSON.stringify({ public_ids })
  });
  return res.json();
}
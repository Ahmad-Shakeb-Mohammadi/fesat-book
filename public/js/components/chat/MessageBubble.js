import { appState } from "../../state.js";
import { getMessageStatus, downloadedFiles } from "../../chat/chatState.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function MessageBubble(message, conversationType, conversationId) {
  const currentUserId = appState.user._id;
  const isOwn = message.senderId._id === currentUserId;
  const isDeleted = !!message.deletedForEveryoneAt;
  const isEdited = !!message.editedAt;
  const isGroup = conversationType === "group";

  const date = new Date(message.createdAt);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isDeleted) {
    return `
      <div class="d-flex ${isOwn ? "justify-content-end" : "justify-content-start"} mb-2 px-3">
        <div class="message-deleted px-3 py-2 rounded-3">
          <p class="message-deleted-text mb-0 text-muted fst-italic">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1 message-deleted-icon">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M4.285 9.567a.5.5 0 0 1 .683.183A3.498 3.498 0 0 0 8 11.5a3.498 3.498 0 0 0 3.032-1.75.5.5 0 1 1 .866.5A4.498 4.498 0 0 1 8 12.5a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .183-.683zM7 6.5C7 7.328 6.552 8 6 8s-1-.672-1-1.5S5.448 5 6 5s1 .672 1 1.5zm4 0c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S9.448 5 10 5s1 .672 1 1.5z"/>
            </svg>
            This message was deleted
          </p>
          <small class="message-deleted-time text-muted">${time}</small>
        </div>
      </div>
    `;
  }

  let replyHtml = "";
  if (message.replyTo) {
    const reply = message.replyTo;
    const replyText = reply.deletedForEveryoneAt
      ? "Deleted message"
      : (reply.text || (reply.attachments?.length > 0 ? "📎 Attachment" : ""));
    replyHtml = `
      <div class="message-reply px-2 py-1 mb-2 rounded-2 border-start border-3 ${isOwn ? "message-reply-own" : "message-reply-other"}">
        <div class="message-reply-name fw-semibold text-truncate ${isOwn ? "message-reply-name-own" : "message-reply-name-other"}">${escapeHtml(reply.senderId?.name || "Unknown")}</div>
        <div class="text-truncate ${isOwn ? "text-white-50" : "text-muted"}">${escapeHtml(replyText)}</div>
      </div>
    `;
  }

  let attachmentsHtml = "";
  if (message.attachments?.length > 0) {
    const isUploading = message.isUploading;
    const cancelTop = isUploading ? `
    <div class="chat-uploading-header">
      <small class="${isOwn ? 'text-white-50' : 'text-muted'}">Uploading ${message.attachments.length} files...</small>
      <button class="chat-upload-cancel-btn cancel-upload-btn" data-temp-id="${message._id}">Cancel ✕</button>
    </div>
  ` : '';

    attachmentsHtml = `<div class="d-flex flex-column gap-2 mb-2">
    ${cancelTop}
    ${message.attachments.map(att => {
      const public_id = att.public_id;
      const resource_type = att.resource_type;
      const progress = att.progress || 0;

      if (att.type === "image") {
        return `
          <div class="chat-media-container chat-media-image chat-media-uploading" 
               data-public-id="${public_id || ''}" 
               data-resource-type="${resource_type}"
               data-conversation-id="${conversationId}">
            ${isUploading ? `
              <div class="chat-media-uploading-placeholder">
                <div class="spinner-border spinner-border-sm text-white"></div>
                <small class="text-white ms-2">${progress}%</small>
              </div>
              <div class="chat-upload-progress">
                <div class="chat-upload-progress-bar upload-progress-bar" style="width:${progress}%"></div>
              </div>
            ` : `<img class="chat-media-img" alt="Chat image" loading="lazy">`}
          </div>
        `;
      }
      if (att.type === "video") {
        return `
          <div class="chat-media-container chat-media-video-wrap chat-media-uploading"
               data-public-id="${public_id || ''}"
               data-resource-type="${resource_type}"
               data-conversation-id="${conversationId}">
            ${isUploading ? `
              <div class="chat-media-uploading-placeholder">
                <div class="spinner-border spinner-border-sm text-white"></div>
                <small class="text-white ms-2">${progress}%</small>
              </div>
              <div class="chat-upload-progress">
                <div class="chat-upload-progress-bar upload-progress-bar" style="width:${progress}%"></div>
              </div>
            ` : `<video class="chat-media-video" preload="none" controls></video>`}
          </div>
        `;
      }
      if (att.type === "file") {
        const fileIcon = getFileIcon(att.format);
        return `
          <a href="#"
            class="chat-media-link d-flex align-items-center gap-2 p-2 rounded-3 ${isOwn ? 'bg-white bg-opacity-25' : 'bg-light'} text-decoration-none position-relative"
            data-public-id="${att.public_id || ''}"
            data-resource-type="${att.resource_type}"
            data-conversation-id="${conversationId}"
            data-original-name="${escapeHtml(att.originalName || 'file')}"
            data-format="${att.format}">
            <div class="chat-file-icon d-flex align-items-center justify-content-center rounded-2 flex-shrink-0" style="width:36px;height:36px;background:${fileIcon.bg};">${fileIcon.svg}</div>
            <div class="flex-grow-1 min-width-0">
              <div class="text-truncate small fw-semibold ${isOwn ? 'text-white' : 'text-dark'}">${escapeHtml(att.originalName || "File")}</div>
              <small class="${isOwn ? 'text-white-50' : 'text-muted'}">${formatFileSize(att.size)} • ${att.format?.toUpperCase()} ${isUploading ? `• ${progress}%` : ''}</small>
              ${isUploading ? `<div class="chat-upload-progress"><div class="chat-upload-progress-bar upload-progress-bar" style="width:${progress}%"></div></div>` : ''}
            </div>
            ${isUploading ? '' : `<div class="chat-file-download"><svg width="18" height="18" fill="${isOwn ? 'rgba(255,255,255,0.7)' : '#6c757d'}" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg></div>`}
          </a>
        `;
      }
    }).join("")}</div>`;
  }

  const textHtml = message.text ? `<p class="message-text mb-0">${escapeHtml(message.text)}</p>` : "";

  const senderNameHtml = (isGroup && !isOwn)
    ? `<small class="message-sender-name fw-semibold d-block mb-1">${escapeHtml(message.senderId.name)}</small>`
    : "";

  let tickHtml = "";
  if (isOwn) {
    const status = getMessageStatus(message._id);
    if (status.read) {
      tickHtml = `<div class="message-tick"><svg width="16" height="11" fill="#53bdeb" viewBox="0 0 16 11"><path d="M8.97.653a.5.5 0 0 0-.478.316L4.82 9.973 1.936 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/><path d="M12.97.653a.5.5 0 0 0-.478.316L8.82 9.973 7.436 8.89a.5.5 0 1 0-.59.793l2 1.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    } else if (status.delivered) {
      tickHtml = `<div class="message-tick"><svg width="16" height="11" fill="#4a4a4a" viewBox="0 0 16 11"><path d="M8.97.653a.5.5 0 0 0-.478.316L4.82 9.973 1.936 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/><path d="M12.97.653a.5.5 0 0 0-.478.316L8.82 9.973 7.436 8.89a.5.5 0 1 0-.59.793l2 1.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    } else {
      tickHtml = `<div class="message-tick"><svg width="12" height="11" fill="#4a4a4a" viewBox="0 0 16 11"><path d="M11.071.653a.5.5 0 0 0-.478.316L6.92 9.973 4.036 7.89a.5.5 0 1 0-.59.793l3.5 2.5a.5.5 0 0 0 .752-.176l4-9a.5.5 0 0 0-.627-.654Z"/></svg></div>`;
    }
  }

  return `
    <div class="d-flex ${isOwn ? "justify-content-end" : "justify-content-start"} mb-2 px-3 message-bubble-wrapper" data-message-id="${message._id}" data-is-uploading="${message.isUploading ? 'true' : 'false'}">
      <div class="message-bubble-container position-relative">
        <div class="message-bubble px-3 py-2 rounded-3 ${isOwn ? "message-bubble-own text-white" : "message-bubble-other"}">
          ${senderNameHtml}
          ${replyHtml}
          ${attachmentsHtml}
          ${textHtml}
          <div class="d-flex align-items-center justify-content-end gap-1 mt-1">
            ${isEdited ? `<small class="message-edited ${isOwn ? "message-edited-own" : ""}">edited</small>` : ""}
            <small class="message-time ${isOwn ? "message-time-own" : ""}">${time}</small>
          </div>
        </div>

        ${tickHtml}

        ${message.isUploading ? '' : `
          <div class="message-actions ${isOwn ? "message-actions-own" : "message-actions-other"}">
            <button class="message-action-btn" data-action="menu" data-message-id="${message._id}">
              <svg viewBox="0 0 16 16"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
            </button>
          </div>
        `}
      </div>
    </div>
  `;
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export function getFileIcon(format) {
  const f = (format || '').toLowerCase();
  const icons = {
    pdf: { bg: '#dc3545', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="5" font-weight="bold" fill="white" text-anchor="middle">PDF</text></svg>` },
    doc: { bg: '#2b579a', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">DOC</text></svg>` },
    docx: { bg: '#2b579a', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="3.5" font-weight="bold" fill="white" text-anchor="middle">DOCX</text></svg>` },
    xls: { bg: '#217346', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">XLS</text></svg>` },
    xlsx: { bg: '#217346', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="3.5" font-weight="bold" fill="white" text-anchor="middle">XLSX</text></svg>` },
    ppt: { bg: '#d24726', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">PPT</text></svg>` },
    pptx: { bg: '#d24726', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="3" font-weight="bold" fill="white" text-anchor="middle">PPTX</text></svg>` },
    txt: { bg: '#6c757d', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">TXT</text></svg>` },
    csv: { bg: '#217346', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">CSV</text></svg>` },
    json: { bg: '#000', svg: `<svg width="20" height="20" fill="#f0db4f" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="3" font-weight="bold" fill="#f0db4f" text-anchor="middle">{ }</text></svg>` },
    zip: { bg: '#ffc107', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/><text x="8" y="11" font-size="4" font-weight="bold" fill="white" text-anchor="middle">ZIP</text></svg>` },
  };
  return icons[f] || { bg: '#6c757d', svg: `<svg width="20" height="20" fill="white" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/></svg>` };
}
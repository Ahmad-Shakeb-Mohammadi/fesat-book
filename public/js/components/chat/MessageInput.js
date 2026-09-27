/**
 * Message input area with text, file upload, and reply preview
 */
export function MessageInput() {
  return `
    <div class="message-input-container border-top bg-white p-3">
      
      <!-- Reply preview (hidden by default) -->
      <div class="reply-preview d-none mb-2 px-3 py-2 rounded-3 d-flex align-items-center justify-content-between" 
           id="replyPreview">
        <div class="min-width-0 flex-grow-1">
          <small class="reply-preview-name fw-semibold d-block" id="replyName"></small>
          <small class="reply-preview-text text-muted text-truncate d-block" id="replyText"></small>
        </div>
        <button class="btn btn-sm p-0 ms-2 cancel-reply-btn reply-cancel-btn">
          <svg width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
          </svg>
        </button>
      </div>

      <!-- File preview (hidden by default) -->
      <div class="file-preview d-none mb-2" id="filePreview"></div>

      <!-- Input row -->
      <div class="d-flex align-items-end gap-2">
        
        <!-- File attachment button -->
        <button class="message-input-btn btn btn-light rounded-circle flex-shrink-0 p-0" 
                id="attachBtn"
                title="Attach file">
          <svg width="18" height="18" fill="#65676b" viewBox="0 0 16 16">
            <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0V3z"/>
          </svg>
        </button>
        <input type="file" id="fileInput" class="d-none" multiple 
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/json,application/zip,application/x-zip-compressed">

        <!-- Text input -->
        <div class="message-input-wrapper flex-grow-1 position-relative">
          <textarea class="message-textarea form-control border-0" 
                    id="messageInput" 
                    placeholder="Type a message..." 
                    rows="1"
                    maxlength="5000"></textarea>
        </div>

        <!-- Send button -->
        <button class="message-send-btn btn rounded-circle flex-shrink-0 p-0 d-flex align-items-center justify-content-center" 
                id="sendBtn"
                disabled>
          <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
            <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
          </svg>
        </button>

      </div>
    </div>
  `;
}
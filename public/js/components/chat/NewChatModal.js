// frontend/components/chat/NewChatModal.js

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Modern single-modal approach with view states:
 * - 'list': Default contact list + "New Group" button
 * - 'groupSelect': Multi-select participants for group
 * - 'groupDetails': Group name + image (final step)
 */
export function NewChatModal(following = [], viewState = 'list', selectedParticipants = []) {
  if (viewState === 'list') {
    return renderListView(following);
  } else if (viewState === 'groupSelect') {
    return renderGroupSelectView(following, selectedParticipants);
  } else if (viewState === 'groupDetails') {
    return renderGroupDetailsView(selectedParticipants);
  }
}

/**
 * Default view: Contact list with "New Group" button
 */
function renderListView(following) {
  return `
    <div class="new-chat-overlay" id="newChatOverlay" data-view="list">
      <div class="new-chat-modal">
        
        <!-- Header -->
        <div class="new-chat-header d-flex align-items-center justify-content-between p-3 border-bottom">
          <button class="btn btn-sm btn-link text-decoration-none new-chat-close-btn p-0" 
                  style="color: #667eea; font-weight: 600; font-size: 0.9rem;">
            Cancel
          </button>
          <h6 class="fw-bold mb-0">New Message</h6>
          <div style="width: 50px;"></div>
        </div>

        <!-- Search -->
        <div class="p-3 border-bottom">
          <div class="position-relative">
            <svg class="new-chat-search-icon position-absolute top-50 start-0 translate-middle-y ms-3" width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
              <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
              <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
            </svg>
            <input type="text" 
                   class="new-chat-search form-control form-control-sm ps-5" 
                   id="newChatSearchInput"
                   placeholder="Search anyone..."
                   >
          </div>
        </div>

        <!-- User List -->
        <div class="new-chat-list flex-grow-1 overflow-auto" id="newChatUserList">
          <!-- New Group Button (Prominent) -->
          <div class="new-group-trigger-btn d-flex align-items-center p-3 border-bottom" 
               style="cursor: pointer; background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);">
            <div class="new-group-icon rounded-circle d-flex align-items-center justify-content-center me-3" 
                 style="width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <svg width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
              </svg>
            </div>
            <div class="flex-grow-1">
              <h6 class="fw-semibold mb-0" style="font-size: 0.95rem; color: #1c1e21;">New Group</h6>
              <small class="text-muted" style="font-size: 0.8rem;">Create a group conversation</small>
            </div>
            <svg width="18" height="18" fill="#65676b" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </div>

          ${following.length === 0 ? `
            <div class="text-center text-muted p-4">
              <p class="mb-0" style="font-size: 0.9rem;">You're not following anyone yet</p>
            </div>
          ` : following.map(user => `
            <div class="new-chat-user-item d-flex align-items-center p-3" 
                 data-user-id="${user._id}"
                 data-user-name="${escapeHtml(user.name)}">
              <div class="position-relative me-3 flex-shrink-0">
                <img src="${user.profileUrl || 'profiles/default-profile.png'}" 
                     class="rounded-circle" 
                     width="44" height="44"
                     style="object-fit: cover;"
                     onerror="this.onerror=null; this.src='profiles/default-profile.png'">
              </div>
              <div class="flex-grow-1 min-width-0">
                <h6 class="fw-semibold mb-0 text-truncate" style="font-size: 0.9rem; color: #1c1e21;">${escapeHtml(user.name)}</h6>
                <small class="text-muted text-truncate d-block" style="font-size: 0.8rem;">${escapeHtml(user.job || '')}</small>
              </div>
              <button class="btn btn-sm btn-primary rounded-pill new-chat-select-btn px-3">
                Message
              </button>
            </div>
          `).join("")}
        </div>

      </div>
    </div>
  `;
}

/**
 * Group participant selection view (multi-select)
 */
function renderGroupSelectView(following, selectedParticipants) {
  const selectedIds = new Set(selectedParticipants.map(p => p._id));
  const selectedCount = selectedParticipants.length;

  return `
    <div class="new-chat-overlay" id="newChatOverlay" data-view="groupSelect">
      <div class="new-chat-modal">
        
        <!-- Header with Back -->
        <div class="new-chat-header d-flex align-items-center justify-content-between p-3 border-bottom">
          <button class="btn btn-sm btn-link text-decoration-none group-back-btn p-0" 
                  style="color: #667eea; font-weight: 600; font-size: 0.9rem;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
              <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            Back
          </button>
          <h6 class="fw-bold mb-0">Add Participants</h6>
          <div style="width: 70px;"></div>
        </div>

        <!-- Selected Participants Chips (if any) -->
        ${selectedCount > 0 ? `
          <div class="selected-participants-chips p-3 border-bottom bg-light">
            <div class="d-flex flex-wrap gap-2">
              ${selectedParticipants.map(user => `
                <div class="participant-chip d-flex align-items-center gap-2 px-3 py-1 rounded-pill" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 0.85rem;">
                  <span>${escapeHtml(user.name)}</span>
                  <button class="remove-participant-btn border-0 bg-transparent p-0" 
                          data-user-id="${user._id}"
                          style="color: white; cursor: pointer; line-height: 1;">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Search -->
        <div class="p-3 border-bottom">
          <div class="position-relative">
            <svg class="new-chat-search-icon position-absolute top-50 start-0 translate-middle-y ms-3" width="14" height="14" fill="#65676b" viewBox="0 0 16 16">
              <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
              <path d="M10.344 11.742a6.5 6.5 0 0 0 1.398-1.397l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85z"/>
            </svg>
            <input type="text" 
                   class="new-chat-search form-control form-control-sm ps-5" 
                   id="groupParticipantSearchInput"
                   placeholder="Search anyone..."
                   >
          </div>
        </div>

        <!-- Multi-select User List -->
        <div class="new-chat-list flex-grow-1 overflow-auto" id="groupParticipantList">
          ${following.length === 0 ? `
            <div class="text-center text-muted p-4">
              <p class="mb-0" style="font-size: 0.9rem;">No contacts available</p>
            </div>
          ` : following.map(user => {
            const isSelected = selectedIds.has(user._id);
            return `
              <div class="group-participant-item d-flex align-items-center p-3 ${isSelected ? 'selected' : ''}" 
                   data-user-id="${user._id}"
                   data-user-name="${escapeHtml(user.name)}"
                   data-user-profile="${escapeHtml(user.profileUrl || 'profiles/default-profile.png')}"
                   data-user-job="${escapeHtml(user.job || '')}">
                <div class="form-check me-3">
                  <input class="form-check-input participant-checkbox" 
                         type="checkbox" 
                         ${isSelected ? 'checked' : ''}
                         data-user-id="${user._id}">
                </div>
                <div class="position-relative me-3 flex-shrink-0">
                  <img src="${user.profileUrl || 'profiles/default-profile.png'}" 
                       class="rounded-circle" 
                       width="44" height="44"
                       style="object-fit: cover;"
                       onerror="this.onerror=null; this.src='profiles/default-profile.png'">
                </div>
                <div class="flex-grow-1 min-width-0">
                  <h6 class="fw-semibold mb-0 text-truncate" style="font-size: 0.9rem; color: #1c1e21;">${escapeHtml(user.name)}</h6>
                  <small class="text-muted text-truncate d-block" style="font-size: 0.8rem;">${escapeHtml(user.job || '')}</small>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Next Button (Fixed Bottom) -->
        <div class="group-next-btn-container p-3 border-top bg-white">
          <button class="btn btn-primary w-100 group-next-btn" 
                  ${selectedCount < 1 ? 'disabled' : ''}>
            Next ${selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>

      </div>
    </div>
  `;
}

/**
 * Group details view (name + optional image)
 */
function renderGroupDetailsView(selectedParticipants) {
  return `
    <div class="new-chat-overlay" id="newChatOverlay" data-view="groupDetails">
      <div class="new-chat-modal">
        
        <!-- Header with Back -->
        <div class="new-chat-header d-flex align-items-center justify-content-between p-3 border-bottom">
          <button class="btn btn-sm btn-link text-decoration-none group-details-back-btn p-0" 
                  style="color: #667eea; font-weight: 600; font-size: 0.9rem;">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
              <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            Back
          </button>
          <h6 class="fw-bold mb-0">New Group</h6>
          <div style="width: 70px;"></div>
        </div>

        <!-- Group Details Form -->
        <div class="p-4">
          
          <!-- Group Name Input -->
          <div class="mb-4">
            <label for="newGroupNameInput" class="form-label fw-semibold">Group Name</label>
            <input type="text" 
                  class="form-control" 
                  id="newGroupNameInput" 
                  placeholder="Enter group name..."
                  maxlength="50"
                  required>
            <small class="text-muted">Required (min 2 characters)</small>
          </div>

          <!-- Selected Participants Preview -->
          <div class="mb-4">
            <label class="form-label fw-semibold">Participants (${selectedParticipants.length})</label>
            <div class="selected-participants-preview border rounded p-3" style="max-height: 200px; overflow-y: auto;">
              ${selectedParticipants.map(user => `
                <div class="d-flex align-items-center mb-2 pb-2 border-bottom">
                  <img src="${user.profileUrl || 'profiles/default-profile.png'}" 
                       class="rounded-circle me-2" 
                       width="32" height="32"
                       style="object-fit: cover;"
                       onerror="this.onerror=null; this.src='profiles/default-profile.png'">
                  <div class="flex-grow-1 min-width-0">
                    <h6 class="mb-0 text-truncate" style="font-size: 0.85rem;">${escapeHtml(user.name)}</h6>
                    <small class="text-muted text-truncate d-block" style="font-size: 0.75rem;">${escapeHtml(user.job || '')}</small>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Create Button (Fixed Bottom) -->
        <div class="group-create-btn-container p-3 border-top bg-white">
          <button class="btn btn-primary w-100 group-create-btn" id="groupCreateBtn">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
              <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8Zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022ZM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816ZM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/>
            </svg>
            Create Group
          </button>
        </div>

      </div>
    </div>
  `;
}
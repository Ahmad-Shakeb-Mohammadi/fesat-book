// frontend/components/chat/GroupInfoPanel.js

import { appState } from "../../state.js";
import { chatState } from "../../chat/chatState.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function GroupInfoPanel(conversation) {
  if (!conversation || conversation.type !== "group") return "";

  const currentUserId = appState.user._id;
  const activeParticipants = conversation.participants.filter(p => !p.leftAt);
  const currentParticipant = activeParticipants.find(p => p.userId._id === currentUserId);
  const isAdmin = currentParticipant?.role === "admin";

  const membersHtml = renderGroupMembersList(conversation, currentUserId);

  return `
    <!-- Backdrop -->
    <div class="group-info-backdrop" id="groupInfoBackdrop"></div>
    
    <!-- Slide-in Panel -->
    <div class="bg-white d-flex flex-column group-info-panel" id="groupInfoPanel">
      
      <!-- Header -->
      <div class="d-flex align-items-center p-3 border-bottom bg-white position-sticky top-0" style="z-index: 10;">
        <button class="btn btn-light rounded-circle p-0 d-flex align-items-center justify-content-center me-3" 
                style="width: 36px; height: 36px; flex-shrink: 0;"
                id="closeGroupInfoBtn">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
          </svg>
        </button>
        <h5 class="fw-bold mb-0 flex-grow-1 text-center">Group Info</h5>
        <div style="width: 36px;"></div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-grow-1 overflow-auto">
        
        <!-- Group Profile Section -->
        <div class="text-center p-4 border-bottom" style="border-bottom-width: 8px !important; border-color: #f0f2f5 !important;">
          <div class="position-relative d-inline-block mb-3">
            <img src="${conversation.imageUrl || 'profiles/default-group.png'}" 
                alt="Group avatar"
                class="rounded-circle shadow group-info-avatar"
                style="width: 120px; height: 120px; object-fit: cover;"
                onerror="this.onerror=null; this.src='profiles/default-group.png'">
            ${isAdmin ? `
              <button class="btn btn-primary rounded-circle position-absolute bottom-0 end-0 p-0 d-flex align-items-center justify-content-center shadow"
                      style="width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;"
                      id="changeGroupImageBtn"
                      title="Change group photo">
                <svg width="16" height="16" fill="white" viewBox="0 0 16 16">
                  <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                  <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                </svg>
              </button>
              <input type="file" id="groupImageInput" class="d-none" accept="image/jpeg,image/jpg,image/png">
            ` : ''}
          </div>
          <h4 class="fw-bold mb-2 group-info-name" style="font-size: 1.4rem;">${escapeHtml(conversation.name)}</h4>
          <p class="text-muted mb-3" id="groupMemberCountText">${activeParticipants.length} member${activeParticipants.length !== 1 ? 's' : ''}</p>
          
          ${isAdmin ? `
            <div class="d-flex flex-column gap-2 align-items-center" id="groupActionButtons">
              ${conversation.imageUrl && conversation.imageUrl !== '/images/default-group.png' && !conversation.imageUrl.includes('default-group') ? `
                <button class="btn btn-outline-secondary btn-sm rounded-pill group-remove-photo-btn" id="removeGroupImageBtn">
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                  </svg>
                  Remove Photo
                </button>
              ` : ''}
              <button class="btn btn-outline-secondary btn-sm rounded-pill" id="editGroupNameBtn">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                </svg>
                Edit Group Name
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Members Section -->
        <div class="p-3 border-bottom" style="border-bottom-width: 8px !important; border-color: #f0f2f5 !important;">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h6 class="fw-bold text-uppercase mb-0" id="groupMembersSectionTitle" style="font-size: 0.85rem; color: #65676b; letter-spacing: 0.5px;">
              ${activeParticipants.length} Member${activeParticipants.length !== 1 ? 's' : ''}
            </h6>
            ${isAdmin ? `
              <button class="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-1"
                      id="openAddMembersBtn"
                      style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; font-size: 0.85rem;">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Add
              </button>
            ` : ''}
          </div>
          <div class="d-flex flex-column gap-1 group-info-members-list">
            ${membersHtml}
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="p-3">
          <button class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 p-3 group-info-leave-btn">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
              <path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
            </svg>
            Leave Group
          </button>
        </div>

      </div>

    </div>
  `;
}

export function renderGroupMembersList(conversation, currentUserId) {
  const activeParticipants = conversation.participants.filter(p => !p.leftAt);
  const currentParticipant = activeParticipants.find(p => p.userId._id === currentUserId);
  const isAdmin = currentParticipant?.role === "admin";
  const creatorId = conversation.createdBy?.toString();

  return activeParticipants.map(participant => {
    const isCurrentUser = participant.userId._id === currentUserId;
    const isOnline = chatState.onlineUsers.has(participant.userId._id);
    const memberIsAdmin = participant.role === "admin";
    const isCreator = participant.userId._id.toString() === creatorId;

    return `
      <div class="d-flex align-items-center p-3 rounded-3 group-info-member-item">
        <div class="position-relative me-3 flex-shrink-0">
          <img src="${participant.userId.profileUrl || 'profiles/default-profile.png'}" 
               alt="${escapeHtml(participant.userId.name)}"
               class="rounded-circle"
               style="width: 48px; height: 48px; object-fit: cover;"
               onerror="this.onerror=null; this.src='profiles/default-profile.png'">
          ${isOnline ? '<span class="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle" style="width: 12px; height: 12px;"></span>' : ''}
        </div>
        <div class="flex-grow-1 min-width-0">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h6 class="fw-semibold mb-0 text-truncate" style="font-size: 0.95rem;">
              ${escapeHtml(participant.userId.name)}${isCurrentUser ? ' <span class="text-muted fw-normal">(You)</span>' : ''}
            </h6>
            ${isCreator ? '<span class="badge rounded-pill" style="font-size: 0.7rem; background: rgba(255, 193, 7, 0.2); color: #d4a017;">CREATOR</span>' : (memberIsAdmin ? '<span class="badge rounded-pill" style="font-size: 0.7rem; background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%); color: #667eea;">ADMIN</span>' : '')}
          </div>
          <small class="text-muted d-block text-truncate">${escapeHtml(participant.userId.job || 'No job title')}</small>
        </div>

        <!-- Only show 3-dots if viewer is Admin, NOT looking at themselves, and NOT looking at the Creator -->
        ${isAdmin && !isCurrentUser && !isCreator ? `
          <div class="dropdown">
            <button class="btn btn-sm btn-light rounded-circle p-0" 
                    style="width: 32px; height: 32px;"
                    data-bs-toggle="dropdown">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item text-danger" data-action="remove-member" data-user-id="${participant.userId._id}">Remove from group</a></li>
              ${!memberIsAdmin ? `<li><a class="dropdown-item" data-action="make-admin" data-user-id="${participant.userId._id}">Make admin</a></li>` : ''}
              ${memberIsAdmin ? `<li><a class="dropdown-item" data-action="make-admin" data-user-id="${participant.userId._id}">Make member</a></li>` : ''}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }).join("");
}
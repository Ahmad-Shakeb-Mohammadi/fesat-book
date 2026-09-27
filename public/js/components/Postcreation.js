import { postPost, editPost } from "../api.js";
import { Feed } from "./Feed.js";
import { router } from "../router.js";
import { toast } from "../utils/toast.js";
import { appState } from "../state.js";

export function Postcreation(editing = false, post = null) {
    const wrapper = document.createElement("div");
    wrapper.classList.add('mb-3');
    wrapper.innerHTML = `
        <div class="card border-0 rounded-3 post-creation-card">
            <div class="card-body p-3">
                <form id="postForm">
                    <div class="mb-3">
                        <textarea class="form-control rounded-3 caption-input" id="caption" rows="5" placeholder="What's on your mind?" maxlength="2000" style="resize: none;">${editing && post ? post.caption : ''}</textarea>
                        <div class="d-flex justify-content-end mt-1"><small class="char-counter">0/2000</small></div>
                    </div>
                    <div id="error-message" class="alert alert-danger d-none py-2 px-3 mb-3 rounded-3" role="alert"></div>
                    <div class="mb-3">
                        <div class="media-buttons-container">
                            <div>
                                <button type="button" class="media-upload-btn w-100" id="photo-btn">
                                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" id="photoInput" class="d-none">
                                    <div class="media-btn-content">
                                        <p class="media-btn-title">Photo</p>
                                        <div class="media-btn-icon"><svg fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z"/><path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/></svg></div>
                                        <small class="media-btn-info">JPG,GIF.. • 5MB</small>
                                    </div>
                                </button>
                            </div>
                            <div>
                                <button type="button" class="media-upload-btn w-100" id="video-btn">
                                    <input type="file" accept="video/mp4,video/mpeg,video/quicktime,video/webm" id="videoInput" class="d-none">
                                    <div class="media-btn-content">
                                        <p class="media-btn-title">Video</p>
                                        <div class="media-btn-icon"><svg fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z"/><path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.100z"/></svg></div>
                                        <small class="media-btn-info">MP4,.. • 50MB</small>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="media-preview d-none mb-3" id="photo-preview">
                        <div class="d-flex align-items-center gap-3 p-3 rounded-3 bg-light">
                            <img id="image-preview" src="" alt="Preview" class="preview-thumb rounded-2">
                            <div class="flex-grow-1 min-width-0">
                                <p class="mb-1 fw-semibold small text-truncate photo-filename"></p>
                                <div class="d-flex align-items-center gap-2"><small class="text-muted photo-filesize"></small></div>
                            </div>
                            <button type="button" class="btn-remove" id="remove-photo-btn" title="Remove"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg></button>
                        </div>
                    </div>
                    <div class="media-preview d-none mb-3" id="video-preview">
                        <div class="d-flex align-items-center gap-3 p-3 rounded-3 bg-light">
                            <div class="preview-thumb-wrapper">
                                <video id="video-preview-element" class="preview-thumb rounded-2" muted></video>
                                <div class="video-play-overlay"><svg width="16" height="16" fill="white" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg></div>
                            </div>
                            <div class="flex-grow-1 min-width-0">
                                <p class="mb-1 fw-semibold small text-truncate video-filename"></p>
                                <div class="d-flex align-items-center gap-2"><small class="text-muted video-filesize"></small><small class="text-muted video-duration"></small></div>
                            </div>
                            <button type="button" class="btn-remove" id="remove-video-btn" title="Remove"><svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg></button>
                        </div>
                    </div>
                    ${editing && post?.mediaUrl ? `<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="removeMediaCheck"><label class="form-check-label text-muted small" for="removeMediaCheck">Remove existing media</label></div>` : ''}
                    <div class="d-flex flex-column gap-2">
                        <div id="uploadProgress" class="d-none">
                            <div class="d-flex justify-content-between align-items-center mb-1"><small class="text-muted">Uploading...</small><small id="progressText" class="fw-semibold">0%</small></div>
                            <div class="progress" style="height: 6px; border-radius: 10px;"><div id="progressBar" class="progress-bar bg-primary" style="width: 0%; transition: width 0.2s;"></div></div>
                        </div>
                        <div class="d-flex justify-content-end align-items-center gap-2 pt-3 border-top">
                            <button type="button" id="cancelUploadBtn" class="btn btn-outline-danger btn-sm rounded-pill d-none">Cancel</button>
                            <button type="submit" class="btn btn-primary rounded-pill px-4 fw-semibold" id="submit-btn"><span class="btn-text">${editing ? 'Update Post' : 'Share Post'}</span><span class="btn-loader d-none"><span class="spinner-border spinner-border-sm me-2"></span>${editing ? 'Updating...' : 'Posting...'}</span></button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    attachEvents(wrapper, editing, post);
    return wrapper;
}

function attachEvents(wrapper, editing, post) {
    const form = wrapper.querySelector('#postForm');
    const caption = wrapper.querySelector('#caption');
    const counter = wrapper.querySelector('.char-counter');
    const submitBtn = wrapper.querySelector('#submit-btn');
    const photoBtn = wrapper.querySelector('#photo-btn');
    const photoInput = wrapper.querySelector('#photoInput');
    const photoPreview = wrapper.querySelector('#photo-preview');
    const imagePreview = wrapper.querySelector('#image-preview');
    const removePhotoBtn = wrapper.querySelector('#remove-photo-btn');
    const videoBtn = wrapper.querySelector('#video-btn');
    const videoInput = wrapper.querySelector('#videoInput');
    const videoPreview = wrapper.querySelector('#video-preview');
    const videoPreviewElement = wrapper.querySelector('#video-preview-element');
    const removeVideoBtn = wrapper.querySelector('#remove-video-btn');
    const progressContainer = wrapper.querySelector('#uploadProgress');
    const progressBar = wrapper.querySelector('#progressBar');
    const progressText = wrapper.querySelector('#progressText');
    const cancelBtn = wrapper.querySelector('#cancelUploadBtn');

    let currentMediaType = null;
    const isEditing = editing;
    const uploadState = isEditing ? appState.activeUploads.postEditing : appState.activeUploads.postCreation;

    const showProgress = (show) => {
        progressContainer?.classList.toggle('d-none', !show);
        cancelBtn?.classList.toggle('d-none', !show);
        photoBtn.disabled = show;
        videoBtn.disabled = show;
        caption.disabled = show;
    };
    const updateProgress = (percent) => {
        uploadState.progress = percent;
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = percent + '%';
    };
    const clearProgress = () => {
        progressContainer?.classList.add('d-none');
        cancelBtn?.classList.add('d-none');
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = '0%';
        photoBtn.disabled = false;
        videoBtn.disabled = false;
        caption.disabled = false;
        if (cancelBtn) { cancelBtn.disabled = false; cancelBtn.style.opacity = ''; cancelBtn.style.pointerEvents = ''; }
    };
    function clearPhotoPreview() { photoInput.value = ''; imagePreview.src = ''; photoPreview.classList.add('d-none'); currentMediaType = null; }
    function clearVideoPreview() { videoInput.value = ''; videoPreviewElement.src = ''; videoPreview.classList.add('d-none'); currentMediaType = null; }
    function formatFileSize(bytes) { if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]; }
    function formatDuration(seconds) { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, '0')}`; }
    function showError(message) { const errorDiv = wrapper.querySelector('#error-message'); if (!errorDiv) return; errorDiv.textContent = message; errorDiv.classList.remove('d-none'); setTimeout(() => errorDiv.classList.add('d-none'), 5000); }
    function toggleLoading(button, isLoading) { button.disabled = isLoading; button.querySelector('.btn-text')?.classList.toggle('d-none', isLoading); button.querySelector('.btn-loader')?.classList.toggle('d-none', !isLoading); }

    caption.addEventListener('input', () => {
        const length = caption.value.length;
        counter.textContent = `${length}/2000`;
        counter.className = `char-counter ${length > 1800 ? 'text-danger' : length > 1500 ? 'text-warning' : 'text-muted'}`;
    });

    photoBtn.addEventListener('click', () => { if (currentMediaType === 'video') clearVideoPreview(); photoInput.click(); });
    photoInput.addEventListener('change', () => {
        if (uploadState.isUploading) { toast.error('Upload already in progress'); photoInput.value = ''; return; }
        const file = photoInput.files[0]; if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) { showError('Only jpeg, JPG, PNG, GIF or WebP images are allowed'); photoInput.value = ''; return; }
        if (file.size > 5 * 1024 * 1024) { showError('Image must be less than 5MB'); photoInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            wrapper.querySelector('.photo-filename').textContent = file.name;
            wrapper.querySelector('.photo-filesize').textContent = formatFileSize(file.size);
            photoPreview.classList.remove('d-none');
            currentMediaType = 'photo';
        };
        reader.readAsDataURL(file);
    });
    removePhotoBtn.addEventListener('click', () => clearPhotoPreview());
    videoBtn.addEventListener('click', () => { if (currentMediaType === 'photo') clearPhotoPreview(); videoInput.click(); });
    videoInput.addEventListener('change', () => {
        if (uploadState.isUploading) { toast.error('Upload already in progress'); videoInput.value = ''; return; }
        const file = videoInput.files[0]; if (!file) return;
        const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
        if (!allowedTypes.includes(file.type)) { showError('Only MP4, MPEG, MOV or WebM videos are allowed'); videoInput.value = ''; return; }
        if (file.size > 50 * 1024 * 1024) { showError('Video must be less than 50MB'); videoInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            videoPreviewElement.src = e.target.result;
            wrapper.querySelector('.video-filename').textContent = file.name;
            wrapper.querySelector('.video-filesize').textContent = formatFileSize(file.size);
            videoPreviewElement.addEventListener('loadedmetadata', () => {
                const duration = Math.round(videoPreviewElement.duration);
                wrapper.querySelector('.video-duration').textContent = `• ${formatDuration(duration)}`;
            }, { once: true });
            videoPreview.classList.remove('d-none');
            currentMediaType = 'video';
        };
        reader.readAsDataURL(file);
    });
    removeVideoBtn.addEventListener('click', () => clearVideoPreview());

    if (!uploadState.isUploading) clearProgress();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const captionValue = caption.value.trim();
        if (captionValue.length < 2) { showError('Caption must be at least 2 chars'); return; }
        if (uploadState.isUploading) { toast.error('Upload already in progress'); return; }

        let file = null;
        if (currentMediaType === 'photo' && photoInput.files[0]) file = photoInput.files[0];
        else if (currentMediaType === 'video' && videoInput.files[0]) file = videoInput.files[0];

        let abortController = new AbortController();
        uploadState.isUploading = true;
        uploadState.progress = 0;
        uploadState.abortController = abortController;
        uploadState.listeners = [updateProgress];
        if (isEditing) uploadState.postId = post._id;

        // CLEAN PROFESSIONAL CANCEL - prevents cancel when 100% (finishing)
        cancelBtn.onclick = () => {
            if (uploadState.progress >= 100) {
                toast.error('Finishing upload, cannot cancel now');
                return;
            }
            abortController.abort();
            uploadState.isUploading = false;
            uploadState.progress = 0;
            uploadState.abortController = null;
            uploadState.listeners = [];
            if (isEditing) uploadState.postId = null;
            clearProgress();
            toggleLoading(submitBtn, false);
            toast.error('Upload cancelled');
        };

        toggleLoading(submitBtn, true);
        if (file) showProgress(true);

        try {
            if (editing) {
                const removeMediaCheck = wrapper.querySelector('#removeMediaCheck');
                await editPost({
                    caption: captionValue,
                    postId: post._id,
                    file,
                    check: removeMediaCheck?.checked || false,
                    onProgress: updateProgress,
                    abortSignal: abortController.signal
                });
                uploadState.isUploading = false;
                uploadState.progress = 0;
                uploadState.abortController = null;
                uploadState.listeners = [];
                uploadState.postId = null;
                document.querySelectorAll('#uploadProgress').forEach(el => el.classList.add('d-none'));
                document.querySelectorAll('#cancelUploadBtn').forEach(el => el.classList.add('d-none'));
                document.querySelectorAll('#progressBar').forEach(el => el.style.width = '0%');
                document.querySelectorAll('#progressText').forEach(el => el.textContent = '0%');
                document.querySelectorAll('#submit-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.querySelector('.btn-text')?.classList.remove('d-none');
                    btn.querySelector('.btn-loader')?.classList.add('d-none');
                });
                document.querySelectorAll('#photo-btn, #video-btn').forEach(btn => btn.disabled = false);
                document.querySelectorAll('.caption-input, #caption').forEach(el => el.disabled = false);
                if (window.location.pathname == "/editPost" || document.body.contains(wrapper)) {
                    sessionStorage.clear();
                    history.pushState(null, "", "/post");
                    router();
                }
            } else {
                const data = await postPost({
                    caption: captionValue,
                    file,
                    onProgress: updateProgress,
                    abortSignal: abortController.signal
                });
                uploadState.isUploading = false;
                uploadState.progress = 0;
                uploadState.abortController = null;
                uploadState.listeners = [];
                document.querySelectorAll('#uploadProgress').forEach(el => el.classList.add('d-none'));
                document.querySelectorAll('#cancelUploadBtn').forEach(el => el.classList.add('d-none'));
                document.querySelectorAll('#progressBar').forEach(el => el.style.width = '0%');
                document.querySelectorAll('#progressText').forEach(el => el.textContent = '0%');
                document.querySelectorAll('#submit-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.querySelector('.btn-text')?.classList.remove('d-none');
                    btn.querySelector('.btn-loader')?.classList.add('d-none');
                });
                document.querySelectorAll('#photo-btn, #video-btn').forEach(btn => btn.disabled = false);
                document.querySelectorAll('.caption-input, #caption').forEach(el => el.disabled = false);
                const card = Feed(data.post, 'userFeed');
                if (window.location.pathname === "/post") {
                    const middleBar = document.getElementById("main-content--body");
                    if (middleBar) {
                        middleBar.querySelector("#nopost")?.remove();
                        middleBar.querySelector(".mb-3")?.insertAdjacentElement("afterend", card);
                        const newVideo = card.querySelector('.modern-video');
                        if (newVideo && newVideo.dataset.src) { newVideo.src = newVideo.dataset.src; newVideo.load(); }
                    }
                }
                form.reset();
                counter.textContent = '0/2000';
                clearPhotoPreview();
                clearVideoPreview();
                toast.success('Posted!');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            uploadState.isUploading = false;
            uploadState.progress = 0;
            uploadState.abortController = null;
            uploadState.listeners = [];
            if (isEditing) uploadState.postId = null;
            showError(err.message || 'Something went wrong!');
            clearProgress();
            toggleLoading(submitBtn, false);
        }
    });

    if (uploadState.isUploading) {
        const isSamePost = !isEditing || (isEditing && uploadState.postId === post?._id);
        if (isSamePost) {
            const restoreProgress = (percent) => {
                if (progressBar) progressBar.style.width = percent + '%';
                if (progressText) progressText.textContent = percent + '%';
            };
            uploadState.listeners.push(restoreProgress);
            if (progressContainer) {
                progressContainer.classList.remove('d-none');
                progressBar.style.width = uploadState.progress + '%';
                progressText.textContent = uploadState.progress + '%';
                cancelBtn.classList.remove('d-none');
                submitBtn.disabled = true;
                photoBtn.disabled = true;
                videoBtn.disabled = true;
                caption.disabled = true;
                cancelBtn.onclick = () => {
                    if (uploadState.progress >= 100) {
                        toast.error('Finishing upload, cannot cancel now');
                        return;
                    }
                    uploadState.abortController?.abort();
                    uploadState.isUploading = false;
                    uploadState.progress = 0;
                    uploadState.listeners = [];
                    uploadState.abortController = null;
                    if (isEditing) uploadState.postId = null;
                    clearProgress();
                    submitBtn.disabled = false;
                    toast.error('Upload cancelled');
                };
            }
        }
    }
}
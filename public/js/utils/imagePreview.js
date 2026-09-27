let previewEl = null;
let previewImg = null;

function init() {
    previewEl = document.getElementById('global-native-preview');
    previewImg = document.getElementById('global-preview-img');
    if (!previewEl || !previewImg) return;

    // Close on overlay click
    previewEl.addEventListener('click', close);

    // Stop propagation inside the actual image so clicking the photo itself doesn't close it
    previewImg.addEventListener('click', (e) => e.stopPropagation());

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewEl.classList.contains('active')) {
            close();
        }
    });
}

export function openImagePreview(src) {
    if (!previewEl || !previewImg) init();
    if (!previewEl || !previewImg) return;
    if (!src) return;

    previewImg.src = src;
    previewEl.classList.add('active');
}

export function closeImagePreview() {
    if (!previewEl) return;
    previewEl.classList.remove('active');
    // Clear src to completely release browser memory
    if (previewImg) previewImg.src = '';
}

function close() {
    closeImagePreview();
}


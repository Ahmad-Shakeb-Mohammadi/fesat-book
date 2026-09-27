let toastContainer = null;

function createToastContainer() {
    if (toastContainer) return toastContainer;
    
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 p-2 toast-responsive';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
    
    return toastContainer;
}


export function showToast(message, type = 'error', duration = 3000) {
    const container = createToastContainer();
    
    const iconMap = {
        error: '⚠️',
        success: '✅', 
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast show modern-toast modern-toast--${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-header border-0 pb-0">
            <span class="toast-icon">${iconMap[type]}</span>
            <strong class="me-auto toast-title">${type === 'error' ? 'Error' : type.charAt(0).toUpperCase() + type.slice(1)}</strong>
            <button type="button" class="btn-close btn-close-sm" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body pt-0">
            ${message}
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    // Manual close
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    });
}

// Convenience methods
export const toast = {
    error: (message, duration) => showToast(message, 'error', duration),
    success: (message, duration) => showToast(message, 'success', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration)
};
export class PullToRefresh {
    constructor(options = {}) {
        this.onRefresh = options.onRefresh || (() => { });
        this.threshold = options.threshold || 80;

        // Bind methods
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        this.startY = 0;
        this.currentY = 0;
        this.pullDistance = 0;
        this.isPulling = false;
        this.isRefreshing = false;
        this.indicator = null;
        this.isMouse = false;

        this.init();
    }

    init() {
        this.createIndicator();

        // Touch events
        document.addEventListener('touchstart', this.handleStart, { passive: true });
        document.addEventListener('touchmove', this.handleMove, { passive: false });
        document.addEventListener('touchend', this.handleEnd);

        // Mouse events for desktop
        document.addEventListener('mousedown', this.handleStart);
        document.addEventListener('mousemove', this.handleMove);
        document.addEventListener('mouseup', this.handleEnd);

        // Prevent text selection while pulling
        document.addEventListener('selectstart', (e) => {
            if (this.isPulling) e.preventDefault();
        });
    }

    createIndicator() {
        try {
            const existing = document.getElementById('pull-indicator');
            if (existing) existing.remove();

            this.indicator = document.createElement('div');
            this.indicator.id = 'pull-indicator';
            this.indicator.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%) translateY(-100%);
                background: #0a66c2;
                color: white;
                padding: 10px 20px;
                border-radius: 30px;
                z-index: 9999;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transition: transform 0.2s ease, opacity 0.2s ease;
                opacity: 0;
                pointer-events: none;
            `;
            this.indicator.textContent = '↓ Pull to refresh';
            document.body.appendChild(this.indicator);
        } catch (e) {
            // Ignore errors when DOM is not available
        }
    }

    handleStart(e) {
        if (this.isRefreshing) return;

        this.isMouse = e.type === 'mousedown';

        if (window.scrollY <= 0) {
            this.startY = this.isMouse ? e.clientY : e.touches[0].clientY;
            this.isPulling = true;

            if (this.isMouse) {
                try {
                    document.body.style.cursor = 'grabbing';
                    document.body.style.userSelect = 'none';
                } catch (e) {
                    // Ignore errors when DOM is not available
                }
            }
        }
    }

    handleMove(e) {
        if (!this.isPulling || this.isRefreshing) return;

        this.currentY = this.isMouse ? e.clientY : e.touches[0].clientY;
        this.pullDistance = Math.max(0, this.currentY - this.startY);

        if (this.pullDistance > 0 && window.scrollY <= 0) {
            e.preventDefault();

            const progress = Math.min(this.pullDistance / this.threshold, 1);

            try {
                this.indicator.style.opacity = progress;
                this.indicator.style.transform = `translateX(-50%) translateY(${Math.min(this.pullDistance * 0.4, 40)}px)`;

                if (this.pullDistance >= this.threshold) {
                    this.indicator.textContent = '✓ Release to refresh';
                    this.indicator.style.background = '#22c55e';
                } else {
                    this.indicator.textContent = '↓ Pull to refresh';
                    this.indicator.style.background = '#0a66c2';
                }
            } catch (e) {
                // Ignore errors when DOM is not available
            }
        }
    }

    async handleEnd(e) {
        if (this.isMouse) {
            try {
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            } catch (e) {
                // Ignore errors when DOM is not available
            }
        }

        if (!this.isPulling || this.isRefreshing) {
            this.isPulling = false;
            return;
        }

        if (this.pullDistance >= this.threshold) {
            await this.startRefresh();
        } else {
            this.resetIndicator();
        }

        this.isPulling = false;
        this.pullDistance = 0;
    }

    async startRefresh() {
        this.isRefreshing = true;

        try {
            this.indicator.textContent = '⟳ Refreshing...';
            this.indicator.style.opacity = '1';
            this.indicator.style.transform = 'translateX(-50%) translateY(30px)';
        } catch (e) {
            // Ignore errors when DOM is not available
        }

        try {
            await this.onRefresh();
            try {
                this.indicator.textContent = '✓ Updated!';
                this.indicator.style.background = '#22c55e';
            } catch (e) {
                // Ignore errors when DOM is not available
            }
        } catch (error) {
            try {
                this.indicator.textContent = '✗ Failed';
                this.indicator.style.background = '#ef4444';
            } catch (e) {
                // Ignore errors when DOM is not available
            }
        }

        setTimeout(() => {
            this.resetIndicator();
            this.isRefreshing = false;
        }, 1000);
    }

    resetIndicator() {
        try {
            this.indicator.style.opacity = '0';
            this.indicator.style.transform = 'translateX(-50%) translateY(-100%)';
            this.indicator.textContent = '↓ Pull to refresh';
            this.indicator.style.background = '#0a66c2';
        } catch (e) {
            // Ignore errors when DOM is not available
        }
    }

    destroy() {
        document.removeEventListener('touchstart', this.handleStart);
        document.removeEventListener('touchmove', this.handleMove);
        document.removeEventListener('touchend', this.handleEnd);

        document.removeEventListener('mousedown', this.handleStart);
        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('mouseup', this.handleEnd);

        try {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        } catch (e) {
            // Ignore errors when DOM is not available
        }

        try {
            if (this.indicator) {
                this.indicator.remove();
                this.indicator = null;
            }
        } catch (e) {
            // Ignore errors when DOM is not available
        }
    }
}

export class InfiniteScroll {
    constructor(container, loadMoreCallBack, options = {}) {
        this.container = container;
        this.loadMoreCallBack = loadMoreCallBack;
        this.sentinel = null;
        this.observer = null;
        this.isLoading = false;
        this.position = options.position || 'bottom'; // 'top' or 'bottom'
    }

    mount() {
        try {
            this.sentinel = document.createElement("div");
            this.sentinel.id = 'infinite-scroll-sentinel';
            this.sentinel.style.height = '1px';
            this.sentinel.style.width = '100%';

            // Insert at top or bottom based on position
            if (this.position === 'top') {
                this.container.insertBefore(this.sentinel, this.container.firstChild);
            } else {
                this.container.appendChild(this.sentinel);
            }

            this.observer = new IntersectionObserver(async (entries) => {
                if (entries[0].isIntersecting && !this.isLoading) {
                    this.isLoading = true;
                    await this.loadMoreCallBack();
                    this.isLoading = false;
                }
            }, {
                root: null,
                rootMargin: '100px'
            });

            this.observer.observe(this.sentinel);
        } catch (e) {
            console.error("InfiniteScroll mount error:", e);
        }
    }

    destroy() {
        try {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        } catch (e) {
            // Ignore errors
        }

        try {
            if (this.sentinel) {
                this.sentinel.remove();
                this.sentinel = null;
            }
        } catch (e) {
            // Ignore errors
        }

        this.isLoading = false;
    }

    updateSentinelPosition() {
        try {
            if (this.sentinel) {
                this.sentinel.remove();
                if (this.position === 'top') {
                    this.container.insertBefore(this.sentinel, this.container.firstChild);
                } else {
                    this.container.appendChild(this.sentinel);
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }
}
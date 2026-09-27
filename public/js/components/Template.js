export function Template() {
    return `
        <!-- Fixed Navigation Bar -->
        <nav class="app-navbar" id="mainNavbar">
            <div class="navbar-content">
                
                <!-- Mobile Menu Toggle (Left) -->
                <button 
                    class="mobile-menu-toggle" 
                    type="button" 
                    data-bs-toggle="offcanvas" 
                    data-bs-target="#leftMobileMenu"
                    aria-label="Toggle profile menu"
                >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                        <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1v-1c0-1-1-4-6-4s-6 3-6 4v1a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12z"/>
                    </svg>
                </button>

                <!-- Brand Logo -->
                <a class="navbar-brand fw-bold brand-gradient">
                    <span class="brand-full">Fesat Book</span>
                    <span class="brand-short">FB</span>
                </a>

                <!-- Center Navigation Links -->
                <ul class="navbar-nav flex-row flex-grow-1 justify-content-center nav-center">
                    <li class="nav-item">
                        <a class="nav-link nav-link-modern" href="/home" data-link>Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link nav-link-modern" href="/post" data-link>Posts</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link nav-link-modern" href="/network" data-link>Network</a>
                    </li>
                    <li class="nav-item">
                    <a class="nav-link nav-link-modern" href="/messages" data-link>
                        Messages
                        <span class="badge bg-danger rounded-pill nav-badge d-none" id="navUnreadBadge"></span>
                    </a>
                    </li>
                </ul>

                <!-- Mobile Activity Toggle (Right) -->
                <button 
                    class="mobile-menu-toggle" 
                    type="button" 
                    data-bs-toggle="offcanvas" 
                    data-bs-target="#rightMobileMenu"
                    aria-label="Toggle activity menu"
                >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                    </svg>
                </button>
                
            </div>
        </nav>

        <!-- Main Grid Layout -->
        <main class="app-layout">
            
            <!-- Left Fixed Sidebar (Desktop Only) -->
            <aside class="sidebar sidebar-left" aria-label="Profile and navigation">
                <div class="sidebar-scroll">
                    <div id="leftSidebar"></div>
                </div>
            </aside>

            <!-- Main Scrollable Content -->
            <section class="content-main" aria-label="Main content">
                <div id="main-content--body"></div>
            </section>

            <!-- Right Fixed Sidebar (Desktop Only) -->
            <aside class="sidebar sidebar-right" aria-label="Activity and news">
                <div class="sidebar-scroll">
                    <div id="rightSidebar"></div>
                </div>
            </aside>

        </main>

        <!-- Left Mobile Offcanvas Menu -->
        <div class="offcanvas offcanvas-start professional-offcanvas fast-offcanvas" tabindex="-1" id="leftMobileMenu" data-bs-backdrop="true" data-bs-scroll="false" data-bs-keyboard="true">
            <div class="offcanvas-header">
                <div class="d-flex align-items-center">
                    <div class="me-3 profile-icon-wrapper">
                        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
                        </svg>
                    </div>
                    <h5 class="offcanvas-title fw-bold mb-0">Your Profile</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <div id="leftOffcanvasBody"></div>
            </div>
        </div>

        <!-- Right Mobile Offcanvas Menu -->
        <div class="offcanvas offcanvas-end professional-offcanvas fast-offcanvas" tabindex="-1" id="rightMobileMenu" data-bs-backdrop="true" data-bs-scroll="false" data-bs-keyboard="true">
            <div class="offcanvas-header">
                <div class="d-flex align-items-center">
                    <div class="me-3 activity-icon-wrapper">
                        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z"/>
                        </svg>
                    </div>
                    <h5 class="offcanvas-title fw-bold mb-0">News & Activity</h5>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <div class="offcanvas-body">
                <div id="rightOffcanvasBody"></div>
            </div>
        </div>
    `;
}
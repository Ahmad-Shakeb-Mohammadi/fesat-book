export function renderHero() {
    const root = document.getElementById('root') || document.body

    root.innerHTML = `
        <!-- Professional Hero Section -->
        <div class="bg-light min-vh-100">
            <!-- Navigation -->
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top">
                <div class="container">
                    <div class="navbar-brand fw-bold fs-3 text-primary brand-gradient">Fesat Book</div>
                    <div class="d-flex gap-2">
                        <a href="/login" data-link class="btn btn-outline-primary">Log in</a>
                        <a href="/signup" data-link class="btn btn-primary">Sign up</a>
                    </div>
                </div>
            </nav>

            <!-- Hero Content -->
            <div class="container pt-5 mt-5">
                <div class="row min-vh-100 align-items-center">
                    <!-- Left Content -->
                    <div class="col-lg-6 pe-lg-5">
                        <h1 class="display-4 fw-bold mb-4">
                            Connect with friends in a 
                            <span class="text-primary">meaningful way</span>
                        </h1>

                        <p class="lead text-muted mb-4">
                            Share moments, discover content, and build authentic relationships. 
                            Join a community where genuine connections thrive.
                        </p>

                        <!-- Professional CTAs -->
                        <div class="d-flex flex-column flex-sm-row gap-3 mb-5">
                            <a href="/signup" data-link class="btn btn-primary btn-lg px-4 py-3 rounded-3 fw-semibold hero-cta-primary">
                                Get Started Free
                            </a>
                            <a href="/login" data-link class="btn btn-outline-primary btn-lg px-4 py-3 rounded-3">
                                Sign In
                            </a>
                        </div>

                        <!-- Key Benefits -->
                        <div class="row g-3 mb-4">
                            <div class="col-6">
                                <div class="d-flex align-items-center">
                                    <div class="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                                        <svg width="20" height="20" fill="currentColor" class="text-success" viewBox="0 0 16 16">
                                            <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                        </svg>
                                    </div>
                                    <small class="text-muted">Free to use</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="d-flex align-items-center">
                                    <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                                        <svg width="20" height="20" fill="currentColor" class="text-primary" viewBox="0 0 16 16">
                                            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                                        </svg>
                                    </div>
                                    <small class="text-muted">Secure & Private</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Visual -->
                    <div class="col-lg-6 text-center mb-4">
                        <div class="hero-mockup-container">
                            <!-- Simplified Phone Mockup -->
                            <div class="mx-auto" style="width: 240px;">
                                <div class="card border-0 shadow-lg" style="width: 240px; height: 480px; border-radius: 25px;">
                                    <div class="card-body p-3" style="border-radius: 25px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
                                        <div class="bg-white rounded-3 p-3 h-100">
                                            <!-- App Header -->
                                            <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                                                <h6 class="mb-0 fw-bold text-primary">Feed</h6>
                                                <div class="rounded-circle bg-success" style="width: 8px; height: 8px;"></div>
                                            </div>
                                            
                                            <!-- Sample Post -->
                                            <div class="mb-3">
                                                <div class="d-flex align-items-center mb-3">
                                                    <div class="rounded-circle bg-primary" style="width: 32px; height: 32px;"></div>
                                                    <div class="ms-3 flex-grow-1">
                                                        <div class="fw-semibold" style="font-size: 0.8rem;">Ahmad Shakeb</div>
                                                        <small class="text-muted" style="font-size: 0.7rem;">Backend Engineer</small>
                                                    </div>
                                                </div>

                                                <p style="font-size: 0.75rem;" class="mb-3">
                                                    Beautiful moments at Paghman, Afghanistan with friends and nature.
                                                </p>

                                                <!-- Sample Image -->
                                                <div class="rounded-2 mb-3" style="height: 120px; background: linear-gradient(45deg, #ffecd2, #fcb69f);"></div>

                                                <!-- Post Actions -->
                                                <div class="d-flex align-items-center justify-content-between">
                                                    <div class="d-flex gap-3">
                                                    <small class="text-muted d-flex align-items-center">
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" class="me-1">
                                                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                                                        </svg>
                                                        24
                                                    </small>
                                                        <small class="text-muted d-flex align-items-center">
                                                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                                                                <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                                                            </svg>
                                                            8
                                                        </small>
                                                    </div>
                                                    <small class="text-muted">
                                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                            <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                                                        </svg>
                                                    </small>
                                                </div>
                                            </div>

                                            <!-- Second Post Preview -->
                                            <div class="d-flex align-items-center">
                                                <div class="rounded-circle bg-secondary" style="width: 32px; height: 32px;"></div>
                                                <div class="ms-3 flex-grow-1">
                                                    <div class="bg-light rounded" style="height: 8px; width: 70%;"></div>
                                                    <div class="bg-light rounded mt-1" style="height: 6px; width: 50%;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Professional Features Section -->
            <div class="bg-white py-5">
                <div class="container">
                    <div class="text-center mb-5">
                        <h3 class="fw-bold mb-3">Built for meaningful connections</h3>
                        <p class="text-muted">Professional features designed with your privacy and experience in mind</p>
                    </div>
                    
                    <div class="row g-4">
                        <div class="col-lg-4">
                            <div class="text-center p-4">
                                <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                    <svg width="24" height="24" fill="currentColor" class="text-primary" viewBox="0 0 16 16">
                                        <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                                    </svg>
                                </div>
                                <h5 class="fw-semibold mb-3">Real-time Communication</h5>
                                <p class="text-muted">Connect instantly with friends through our secure messaging platform</p>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="text-center p-4">
                                <div class="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                    <svg width="24" height="24" fill="currentColor" class="text-success" viewBox="0 0 16 16">
                                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 0 1h-.5v.5a.5.5 0 0 1-1 0v-.5H-.5a.5.5 0 0 1 0-1H0v-.5a.5.5 0 0 1 .5-.5Z"/>
                                        <path d="M10.5 3.5a2.5 2.5 0 0 0-5 0V4h5v-.5ZM8.5 4v.5a2.5 2.5 0 0 1-5 0V4h5Zm3 .5v.5a3.5 3.5 0 0 1-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5Z"/>
                                    </svg>
                                </div>
                                <h5 class="fw-semibold mb-3">Share Your Story</h5>
                                <p class="text-muted">Post photos, lessons and moments that matter to you and your community</p>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="text-center p-4">
                                <div class="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                                    <svg width="24" height="24" fill="currentColor" class="text-info" viewBox="0 0 16 16">
                                        <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                                    </svg>
                                </div>
                                <h5 class="fw-semibold mb-3">Privacy First</h5>
                                <p class="text-muted">Your data is secure with enterprise-level privacy controls</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}
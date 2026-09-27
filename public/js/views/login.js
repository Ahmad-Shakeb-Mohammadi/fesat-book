import { tokenManager } from "../tokenManager.js"

export function renderLogin() {
    const root = document.getElementById('root') || document.body;
    
    root.innerHTML = `
        <!-- Compact Login Page -->
        <div class="bg-light">
            <!-- Header -->
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                <div class="container">
                    <h1 class="navbar-brand fw-bold fs-4 brand-gradient">Fesat Book</h1>
                    <div class="d-flex align-items-center">
                        <small class="text-muted me-3">Need an account?</small>
                        <a href="/signup" data-link class="btn btn-primary btn-sm">Sign Up</a>
                    </div>
                </div>
            </nav>

            <!-- Main Content -->
            <div class="container py-4">
                <div class="row justify-content-center">
                    <div class="col-12 col-lg-10">
                        <div class="row g-4 align-items-start">
                            <!-- Left Side - Welcome Message -->
                            <div class="col-lg-4 d-none d-lg-block">
                                <div class="pe-3">
                                    <h3 class="fw-bold mb-3">Welcome back!</h3>
                                    <p class="text-muted mb-3">Sign in to continue connecting with friends.</p>
                                    
                                    <!-- Quick Features -->
                                    <div class="d-flex flex-column gap-2">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary bg-opacity-10 rounded-circle p-1 me-2" style="width: 28px; height: 28px;">
                                                <svg width="14" height="14" fill="currentColor" class="text-primary d-block mx-auto mt-1" viewBox="0 0 16 16">
                                                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                                                </svg>
                                            </div>
                                            <small class="text-muted">Secure login</small>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <div class="bg-success bg-opacity-10 rounded-circle p-1 me-2" style="width: 28px; height: 28px;">
                                                <svg width="14" height="14" fill="currentColor" class="text-success d-block mx-auto mt-1" viewBox="0 0 16 16">
                                                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.010c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
                                                </svg>
                                            </div>
                                            <small class="text-muted">Instant access</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Side - Login Form -->
                            <div class="col-lg-8">
                                <div class="row justify-content-center">
                                    <div class="col-12 col-md-7">
                                        <div class="card border-0 shadow">
                                            <div class="card-body p-4">
                                                <!-- Form Header -->
                                                <div class="text-center mb-3">
                                                    <h4 class="fw-bold mb-1">Sign in to your account</h4>
                                                    <p class="text-muted small">Enter your credentials to continue</p>
                                                </div>

                                                <!-- Login Form -->
                                                <form id="loginForm">
                                                    <div class="mb-3">
                                                        <label for="email" class="form-label fw-semibold small">Email address</label>
                                                        <input type="email" name="email" class="form-control form-control-sm" id="email" placeholder="your@email.com" required>
                                                        <div class="invalid-feedback"></div>
                                                    </div>

                                                    <div class="mb-3">
                                                        <label for="password" class="form-label fw-semibold small">Password</label>
                                                        <div class="input-group input-group-sm">
                                                            <input type="password" minlength="8" name="password" class="form-control" id="password" placeholder="Enter password" required>
                                                            <button class="btn btn-outline-secondary btn-sm" type="button" id="togglePassword">
                                                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                                                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                        <div class="invalid-feedback"></div>
                                                    </div>

                                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                                        <a href="#" class="text-primary text-decoration-none small nav-link-modern">Forgot password?</a>
                                                    </div>

                                                    <!-- Error Message -->
                                                    <div id="errorMessage" class="alert alert-danger d-none mb-2 py-2"></div>

                                                    <!-- Submit Button -->
                                                    <div class="d-grid mb-3">
                                                        <button type="submit" class="btn btn-primary py-2 fw-semibold" id="submitBtn">
                                                            <span class="spinner-border spinner-border-sm me-2 d-none" id="submitSpinner"></span>
                                                            <span id="submitText">Sign In</span>
                                                        </button>
                                                    </div>
                                                </form>
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
    `

    initializeLoginForm()
}

function initializeLoginForm() {
    // Elements
    const form = document.getElementById('loginForm')
    const errorDiv = document.getElementById('errorMessage')
    const submitBtn = document.getElementById('submitBtn')
    const submitSpinner = document.getElementById('submitSpinner')
    const submitText = document.getElementById('submitText')
    const passwordInput = document.getElementById('password')
    const togglePassword = document.getElementById('togglePassword')

    // Password toggle functionality
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password'
        passwordInput.type = type
    })

    // Form validation
    function validateForm() {
        const email = document.getElementById('email')
        const password = document.getElementById('password')
        let valid = true

        // Reset validation states
        email.classList.remove('is-invalid')
        password.classList.remove('is-invalid')

        // Validate email
        if (!email.value || !email.checkValidity()) {
            email.classList.add('is-invalid')
            valid = false
        }

        // Validate password
        if (!password.value || password.value.length < 8) {
            password.classList.add('is-invalid')
            valid = false
        }

        return valid
    }

    // Form submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault()

        // Validate form
        if (!validateForm()) {
            return
        }

        const formData = new FormData(form)
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        }

        // Clear previous errors
        errorDiv.classList.add('d-none')
        
        // Show loading state
        submitBtn.disabled = true
        submitSpinner.classList.remove('d-none')
        submitText.textContent = 'Signing in...'

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const result = await res.json()

            if (!res.ok) {
                // Show error
                errorDiv.textContent = result.message || 'Login failed. Please check your credentials.'
                errorDiv.classList.remove('d-none')
                
                // Reset button state
                submitBtn.disabled = false
                submitSpinner.classList.add('d-none')
                submitText.textContent = 'Sign In'
                return
            }

            // Success - store token and redirect
            tokenManager.set(result.accessToken)
            
            // Success feedback
            submitText.textContent = 'Success! Redirecting...'
            
            // Small delay for user feedback, then redirect
            setTimeout(() => {
                window.location.href = '/'
            }, 300)

        } catch (err) {
            errorDiv.textContent = 'Network error. Please check your connection and try again.'
            errorDiv.classList.remove('d-none')
            
            // Reset button state
            submitBtn.disabled = false
            submitSpinner.classList.add('d-none')
            submitText.textContent = 'Sign In'
        }
    })

    // Real-time validation feedback
    document.getElementById('email').addEventListener('blur', validateForm)
    document.getElementById('password').addEventListener('blur', validateForm)
}
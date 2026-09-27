export function renderSignup() {
    const root = document.getElementById('root') || document.body
    root.innerHTML = `
        <div class="bg-light">
            <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
                <div class="container">
                    <h1 class="navbar-brand fw-bold fs-4 brand-gradient">Fesat Book</h1>
                    <div class="d-flex align-items-center">
                        <small class="text-muted me-2" style="font-size: 0.8rem">Already have account?</small>
                        <a href="/login" data-link class="btn btn-primary btn-sm">Sign In</a>
                    </div>
                </div>
            </nav>
            <div class="container py-4">
                <div class="row justify-content-center">
                    <div class="col-12 col-xl-10">
                        <div class="row g-4 align-items-start">
                            <div class="col-lg-4 d-none d-lg-block">
                                <div class="pe-3">
                                    <h3 class="fw-bold mb-3">Join our community</h3>
                                    <p class="text-muted mb-3">Create your account and start connecting with friends.</p>
                                    <div class="d-flex flex-column gap-2">
                                        <div class="d-flex align-items-center">
                                            <div class="bg-success bg-opacity-10 rounded-circle p-1 me-2" style="width: 28px; height: 28px;">
                                                <svg width="14" height="14" fill="currentColor" class="text-success d-block mx-auto mt-1" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg>
                                            </div>
                                            <small class="text-muted">Free forever</small>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <div class="bg-primary bg-opacity-10 rounded-circle p-1 me-2" style="width: 28px; height: 28px;">
                                                <svg width="14" height="14" fill="currentColor" class="text-primary d-block mx-auto mt-1" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
                                            </div>
                                            <small class="text-muted">Your privacy protected</small>
                                        </div>
                                        <div class="d-flex align-items-center">
                                            <div class="bg-info bg-opacity-10 rounded-circle p-1 me-2" style="width: 28px; height: 28px;">
                                                <svg width="14" height="14" fill="currentColor" class="text-info d-block mx-auto mt-1" viewBox="0 0 16 16"><path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.010c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/></svg>
                                            </div>
                                            <small class="text-muted">Connect instantly</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-lg-8">
                                <div class="card border-0 shadow">
                                    <div class="card-body p-4">
                                        <div class="text-center mb-3">
                                            <h4 class="fw-bold mb-1">Create your account</h4>
                                            <p class="text-muted small">Fill in your details to get started</p>
                                        </div>
                                        <div class="progress mb-3" style="height: 3px;">
                                            <div class="progress-bar bg-primary" id="formProgress" role="progressbar" style="width: 33%"></div>
                                        </div>
                                        <form id="signupForm" novalidate>
                                            <div id="step1" class="form-step">
                                                <div class="row g-2">
                                                    <div class="col-12">
                                                        <label for="email" class="form-label fw-semibold small">Email address</label>
                                                        <input type="email" name="email" class="form-control form-control-sm" id="email" maxlength="45" placeholder="your@email.com" required>
                                                        <div class="invalid-feedback"></div>
                                                    </div>
                                                    <div class="col-12">
                                                        <label for="password" class="form-label fw-semibold small">Password</label>
                                                        <div class="input-group input-group-sm">
                                                            <input type="password" minlength="8" name="password" class="form-control" id="password" placeholder="Create password" maxlength="45" required>
                                                            <button class="btn btn-outline-secondary btn-sm" type="button" id="togglePassword">
                                                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
                                                            </button>
                                                        </div>
                                                        <div class="invalid-feedback"></div>
                                                        <div class="mt-1">
                                                            <div class="d-flex justify-content-between align-items-center">
                                                                <small class="text-muted">Strength</small>
                                                                <small class="text-muted" id="passwordStrengthText">Weak</small>
                                                            </div>
                                                            <div class="progress" style="height: 3px;">
                                                                <div class="progress-bar bg-danger" id="passwordStrength" style="width: 0%"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="step2" class="form-step d-none">
                                                <div class="row g-2">
                                                    <div class="col-12">
                                                        <label for="name" class="form-label fw-semibold small">Full Name</label>
                                                        <input type="text" minlength="3" name="name" class="form-control form-control-sm" id="name" placeholder="Enter your full name" maxlength="30" required>
                                                        <div class="invalid-feedback"></div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="country" class="form-label fw-semibold small">Country</label>
                                                        <input type="text" pattern="[A-Za-z ]+" minlength="3" maxlength="30" name="country" class="form-control form-control-sm" id="country" placeholder="Your country" required>
                                                        <div class="invalid-feedback"></div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="city" class="form-label fw-semibold small">City</label>
                                                        <input type="text" pattern="[A-Za-z ]+" minlength="3" maxlength="30" name="city" class="form-control form-control-sm" id="city" placeholder="Your city" required>
                                                        <div class="invalid-feedback"></div>
                                                    </div>
                                                    <div class="col-12">
                                                        <label for="job" class="form-label fw-semibold small">Profession <span class="text-muted">(Optional)</span></label>
                                                        <input type="text" pattern="[A-Za-z ]+" minlength="3" maxlength="45" name="job" class="form-control form-control-sm" id="job" placeholder="What do you do?">
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="step3" class="form-step d-none">
                                                <div class="row g-2">
                                                    <div class="col-12">
                                                        <label for="gender" class="form-label fw-semibold small">Gender</label>
                                                        <select class="form-select form-select-sm" id="gender" name="gender" required>
                                                            <option value="" selected disabled>Select your gender</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Non binary">Non binary</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                        <input type="text" id="otherGender" name="otherGender" class="form-control form-control-sm mt-1 d-none" pattern="[A-Za-z ]+" minlength="3" maxlength="30" placeholder="Please specify">
                                                        <div class="invalid-feedback"></div>
                                                    </div>
                                                    <div class="col-12">
                                                        <label for="profileImage" class="form-label fw-semibold small">Profile Picture <span class="text-muted">(Optional)</span></label>
                                                        <div class="upload-container border border-dashed rounded p-3 text-center">
                                                            <input class="form-control d-none" type="file" id="profileImage" name="profileImage" accept="image/png, image/jpeg, image/jpg">
                                                            <div class="upload-placeholder">
                                                                <svg width="32" height="32" fill="currentColor" class="text-muted mb-2" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.646 5.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V10.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2z"/><path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/></svg>
                                                                <p class="mb-1 fw-semibold small">Click to upload</p>
                                                                <p class="text-muted small mb-0">PNG, JPG up to 5MB</p>
                                                            </div>
                                                            <div class="upload-preview d-none">
                                                                <img class="upload-preview-img rounded mb-1" style="max-width: 60px; max-height: 60px;">
                                                                <p class="mb-1 fw-semibold small upload-filename"></p>
                                                                <button type="button" class="btn btn-outline-danger btn-sm" id="removeImage">Remove</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="errorMessage" class="alert alert-danger d-none mt-2 py-2"></div>
                                            <div class="d-flex justify-content-between mt-3">
                                                <button type="button" class="btn btn-outline-secondary btn-sm d-none" id="prevBtn">Previous</button>
                                                <button type="button" class="btn btn-primary btn-sm px-3" id="nextBtn">Next</button>
                                                <button type="submit" class="btn btn-primary btn-sm px-3 d-none" id="submitBtn"><span class="spinner-border spinner-border-sm me-2 d-none" id="submitSpinner"></span>Create Account</button>
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
    `
    initializeSignupForm()
}

function initializeSignupForm() {
    let currentStep = 1
    const totalSteps = 3
    const prevBtn = document.getElementById('prevBtn')
    const nextBtn = document.getElementById('nextBtn')
    const submitBtn = document.getElementById('submitBtn')
    const progress = document.getElementById('formProgress')
    const form = document.getElementById('signupForm')
    const errorDiv = document.getElementById('errorMessage')
    const genderSelect = document.getElementById('gender')
    const otherInput = document.getElementById('otherGender')
    const passwordInput = document.getElementById('password')
    const togglePassword = document.getElementById('togglePassword')
    const passwordStrength = document.getElementById('passwordStrength')
    const passwordStrengthText = document.getElementById('passwordStrengthText')
    const fileInput = document.getElementById('profileImage')
    const uploadContainer = document.querySelector('.upload-container')
    const uploadPlaceholder = document.querySelector('.upload-placeholder')
    const uploadPreview = document.querySelector('.upload-preview')
    let cloudinaryPublicId = null; // NEW: store public_id

    function updateProgress() { progress.style.width = (currentStep / totalSteps) * 100 + '%' }
    function showStep(step) {
        document.querySelectorAll('.form-step').forEach(s => s.classList.add('d-none'))
        document.getElementById(`step${step}`).classList.remove('d-none')
        prevBtn.classList.toggle('d-none', step === 1)
        nextBtn.classList.toggle('d-none', step === totalSteps)
        submitBtn.classList.toggle('d-none', step !== totalSteps)
        updateProgress()
    }
    function validateCurrentStep() {
        const currentStepElement = document.getElementById(`step${currentStep}`)
        const inputs = currentStepElement.querySelectorAll('input[required], select[required]')
        let valid = true
        inputs.forEach(input => {
            input.classList.remove('is-invalid')
            if (!input.checkValidity()) { input.classList.add('is-invalid'); valid = false; }
        })
        return valid
    }
    function checkPasswordStrength(password) {
        let strength = 0
        if (password.length >= 8) strength += 25
        if (/[a-z]/.test(password)) strength += 25
        if (/[A-Z]/.test(password)) strength += 25
        if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25
        let color = 'bg-danger', text = 'Weak'
        if (strength >= 50) { color = 'bg-warning'; text = 'Fair'; }
        if (strength >= 75) { color = 'bg-success'; text = 'Strong'; }
        passwordStrength.className = `progress-bar ${color}`
        passwordStrength.style.width = strength + '%'
        passwordStrengthText.textContent = text
    }

    prevBtn.addEventListener('click', () => { if (currentStep > 1) { currentStep--; showStep(currentStep); } })
    nextBtn.addEventListener('click', () => { if (validateCurrentStep() && currentStep < totalSteps) { currentStep++; showStep(currentStep); } })
    togglePassword.addEventListener('click', () => { passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password' })
    passwordInput.addEventListener('input', (e) => { checkPasswordStrength(e.target.value) })
    genderSelect.addEventListener('change', function () {
        if (this.value === 'Other') { otherInput.classList.remove('d-none'); otherInput.required = true; }
        else { otherInput.classList.add('d-none'); otherInput.required = false; otherInput.value = ''; }
    })

    uploadContainer.addEventListener('click', () => fileInput.click())
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { errorDiv.textContent = 'Max 5MB'; errorDiv.classList.remove('d-none'); fileInput.value = ''; return; }
            const reader = new FileReader()
            reader.onload = function (e) {
                uploadPlaceholder.classList.add('d-none')
                uploadPreview.classList.remove('d-none')
                uploadPreview.querySelector('.upload-preview-img').src = e.target.result
                uploadPreview.querySelector('.upload-filename').textContent = file.name
            }
            reader.readAsDataURL(file)
        }
    })
    document.getElementById('removeImage').addEventListener('click', () => {
        fileInput.value = ''
        cloudinaryPublicId = null
        uploadPlaceholder.classList.remove('d-none')
        uploadPreview.classList.add('d-none')
    })

    async function uploadToCloudinary(file) {
        const sigRes = await fetch('/cloudinary/signup-signature', { method: 'POST' });
        if (!sigRes.ok) throw new Error('Failed to get signature');
        const sig = await sigRes.json();
        const form = new FormData();
        form.append("file", file);
        form.append("api_key", sig.apiKey);
        form.append("timestamp", sig.timestamp);
        form.append("signature", sig.signature);
        form.append("folder", sig.folder);
        form.append("type", sig.type);
        form.append("allowed_formats", sig.allowed_formats.join(","));
        form.append("use_filename", "true");
        form.append("unique_filename", "true");
        form.append("overwrite", "false");
        const res = await fetch(sig.uploadUrl, { method: "POST", body: form });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.public_id;
    }

    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentStep !== totalSteps) {
            e.preventDefault();
            if (validateCurrentStep() && currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            }
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (!validateCurrentStep()) return

        const submitSpinner = document.getElementById('submitSpinner')
        errorDiv.classList.add('d-none')
        submitBtn.disabled = true
        submitSpinner.classList.remove('d-none')

        try {
            let public_id = null;
            const file = fileInput.files[0];
            if (file) {
                public_id = await uploadToCloudinary(file);
            }

            const payload = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
                name: document.getElementById('name').value.trim(),
                country: document.getElementById('country').value.trim(),
                city: document.getElementById('city').value.trim(),
                job: document.getElementById('job').value.trim(),
                gender: genderSelect.value === 'Other' ? otherInput.value.trim() : genderSelect.value,
                public_id: public_id
            };

            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const result = await res.json()
            if (!res.ok) {
                errorDiv.textContent = result.message || 'Signup failed'
                errorDiv.classList.remove('d-none')
                submitBtn.disabled = false
                submitSpinner.classList.add('d-none')
                return
            }
            window.location.href = '/login'
        } catch (err) {
            errorDiv.textContent = err.message || 'Network error'
            errorDiv.classList.remove('d-none')
            submitBtn.disabled = false
            submitSpinner.classList.add('d-none')
        }
    })
    showStep(1)
}
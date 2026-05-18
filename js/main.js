// js/main.js

// --- 1. Constants & Utilities ---
const USER_KEY = 'scms_user';
const ALL_COMPLAINTS_KEY = 'scms_all_complaints'; // Key to cache all fetched complaints
const API_BASE = 'api/'; // Base path for PHP endpoints

function badgeForStatus(s) {
    if (!s) return 'secondary';
    if (s === 'open') return 'danger';
    if (s === 'in_progress') return 'primary';
    if (s === 'resolved') return 'success';
    return 'secondary';
}

function capitalize(s) {
    return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function timeSince(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diff = now - past;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return days === 1 ? '1 day ago' : `${days} days ago`;
    if (hours > 0) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    if (minutes > 0) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    return 'just now';
}

function getUser() {
    try {
        const userJson = sessionStorage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

function renderMessage(id, message, isError = true) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message;
        el.className = `small mt-2 ${isError ? 'text-danger' : 'text-success'}`;
    }
}

// --- 2. Authentication & Redirection ---

function renderNavBar(user) {
    const authContainer = document.getElementById('authNavContainer');
    if (authContainer) {
        authContainer.innerHTML = '';
        if (user) {
            if (user.role === 'admin') {
                // Admin: only Logout button
                authContainer.innerHTML = `
                    <button id="logoutBtn" class="btn btn-light btn-sm">Logout (${user.name})</button>
                `;
            } else {
                // Regular user navbar
                authContainer.innerHTML = `
                    <a class="btn btn-outline-light btn-sm me-2" href="submit_complaint.html">
                        <i class="fas fa-plus-circle me-1"></i> New Complaint
                    </a>
                    <a class="btn btn-light btn-sm me-2" href="complaints_list.html">
                        <i class="fas fa-list-ul me-1"></i> My Complaints
                    </a>
                    <button id="logoutBtn" class="btn btn-light btn-sm">Logout (${user.name})</button>
                `;
            }
        } else {
            // Logged-out navbar – pill buttons for Login/Register
            authContainer.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <a href="login.html"
                       class="btn btn-auth-pill btn-auth-login">
                        Login
                    </a>
                    <a href="register.html"
                       class="btn btn-auth-pill btn-auth-register">
                        Register
                    </a>
                </div>
            `;
        }
        document.getElementById('logoutBtn')?.addEventListener('click', logout);
    }
}

function checkAuth(required = true) {
    const user = getUser();
    const pathname = window.location.pathname;

    const publicPages = ['index.html', 'login.html', 'register.html'];
    const isPublicPage = publicPages.some(page => pathname.includes(page));

    if (required && !user && !isPublicPage) {
        console.warn('Unauthorized access. Redirecting to login.');
        sessionStorage.removeItem(USER_KEY);
        window.location.href = 'login.html';
        return null;
    }

    if (user && isPublicPage) {
        if (pathname.includes('login.html') || pathname.includes('register.html')) {
            window.location.href = user.role === 'admin' ? 'admin_dashboard.html' : 'dashboard.html';
            return user;
        }
    }

    if (user) {
        if (user.role === 'admin' && pathname.includes('dashboard.html')) {
            // allow
        } else if (user.role !== 'admin' && pathname.includes('admin_dashboard.html')) {
            window.location.href = 'dashboard.html';
            return user;
        }
    }

    return user;
}

function logout() {
    sessionStorage.removeItem(USER_KEY);
    window.location.href = 'index.html';
}

// --- 3. API Communication ---

async function fetchComplaints() {
    if (!getUser()) return [];

    try {
        const response = await fetch(`${API_BASE}get_complaints.php`);
        const result = await response.json();

        if (response.ok && result.success) {
            sessionStorage.setItem(ALL_COMPLAINTS_KEY, JSON.stringify(result.data));
            return result.data;
        } else if (response.status === 401) {
            console.warn('User session expired. Redirecting to login.');
            sessionStorage.removeItem(USER_KEY);
            window.location.href = 'login.html';
            return [];
        } else {
            console.error('Failed to fetch complaints:', result.message);
            return [];
        }
    } catch (e) {
        console.error('Network or parsing error during fetch:', e);
        return [];
    }
}

async function updateComplaintStatus(complaintId, newStatus) {
    try {
        const response = await fetch(`${API_BASE}update_status.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: complaintId, status: newStatus })
        });
        const result = await response.json();
        return result;
    } catch (e) {
        console.error('Error updating status:', e);
        return { success: false, message: 'Network error or failed to connect to API.' };
    }
}

// --- 4. Data Rendering Functions ---

function renderComplaintList(complaints, targetElementId) {
    const listBody = document.getElementById(targetElementId);
    if (!listBody) return;

    listBody.innerHTML = '';
    const isTable = listBody.tagName === 'TBODY';

    if (complaints.length === 0) {
        const emptyMessage = isTable
            ? `<tr><td colspan="5" class="text-center text-muted py-3">No complaints found.</td></tr>`
            : `<li class="list-group-item text-center text-muted py-3">No complaints found.</li>`;
        listBody.innerHTML = emptyMessage;
        return;
    }

    complaints.forEach(c => {
        const statusBadge = `<span class="badge bg-${badgeForStatus(c.status)} badge-status">${capitalize(c.status)}</span>`;
        const categoryIcon = c.category.includes('Road') ? 'fas fa-road'
                           : c.category.includes('Light') ? 'fas fa-lightbulb'
                           : 'fas fa-tools';

        const listItem = isTable
            ? `
                <tr onclick="window.location.href='complaint_detail.html?id=${c.id}'" style="cursor: pointer;">
                    <td>
                        <h6 class="mb-1 fw-bold text-primary">${c.title} (ID: ${c.id})</h6>
                        <div class="small text-muted d-block d-sm-none">
                            <i class="${categoryIcon} me-1"></i> ${capitalize(c.category)}
                        </div>
                    </td>
                    <td class="d-none d-sm-table-cell">${capitalize(c.category)}</td>
                    <td>${statusBadge}</td>
                    <td class="d-none d-md-table-cell">${timeSince(c.date)}</td>
                    <td><a href="complaint_detail.html?id=${c.id}" class="btn btn-sm btn-outline-primary">View</a></td>
                </tr>
            `
            : `
                <a href="complaint_detail.html?id=${c.id}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3">
                    <div>
                        <h6 class="mb-1 fw-bold text-primary">${c.title} (ID: ${c.id})</h6>
                        <div class="small text-muted">
                            <i class="${categoryIcon} me-1"></i> ${capitalize(c.category)}
                            ${c.submitter ? '• Submitted by ' + c.submitter : ''}
                            • ${timeSince(c.date)}
                        </div>
                    </div>
                    <div>${statusBadge}</div>
                </a>
            `;
        listBody.innerHTML += listItem;
    });
}

function renderComplaintDetail(c) {
    console.log('renderComplaintDetail received:', c);
    if (!c) {
        document.querySelector('.card-body').innerHTML =
            '<p class="text-center text-danger">Complaint not found.</p>';
        return;
    }

    document.getElementById('detailTitle').textContent = c.title;
    document.getElementById('detailMeta').textContent =
        `Submitted by ${c.submitter || 'User'} — ${timeSince(c.date)}`;

    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = capitalize(c.status);
    statusEl.className = `badge bg-${badgeForStatus(c.status)} badge-status`;

    document.getElementById('detailDescription').innerHTML =
        `<p>${c.description.replace(/\n/g, '</p><p>')}</p>`;

    const detailImages = document.getElementById('detailImages');

    // Use image_urls from API (fallback to images if ever used)
    const imgs = c.image_urls || c.images || [];
    detailImages.innerHTML =
        imgs.length > 0
            ? imgs.map(imgUrl => `
                <a href="${imgUrl}" target="_blank">
                    <img src="${imgUrl}" alt="Complaint image"
                         class="img-thumbnail" style="height: 100px; object-fit: cover;">
                </a>
              `).join('')
            : '<p class="text-muted small">No images attached.</p>';

    const user = getUser();
    const adminControls = document.getElementById('adminControlsCard');

    if (user && user.role === 'admin' && adminControls) {
        adminControls.style.display = 'block';

        const statusSelect = document.getElementById('newStatus');
        statusSelect.value = c.status;

        const form = document.getElementById('statusUpdateForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newStatus = statusSelect.value;
            const messageEl = document.getElementById('statusMessage');
            messageEl.textContent = 'Updating...';
            messageEl.className = 'small text-info mt-2';

            const result = await updateComplaintStatus(c.id, newStatus);

            if (result.success) {
                renderMessage('statusMessage', 'Status updated successfully!', false);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                renderMessage('statusMessage', result.message || 'Failed to update status.', true);
            }
        });
    }
}

function renderDashboardStats(complaints) {
    if (!document.getElementById('statTotalCount')) return;

    const openCount = complaints.filter(c => c.status === 'open').length;
    const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
    const resolvedCount = complaints.filter(c => c.status === 'resolved').length;
    const totalCount = complaints.length;

    document.getElementById('statTotalCount').textContent = totalCount;
    document.getElementById('statOpenCount').textContent = openCount;
    document.getElementById('statInProgressCount').textContent = inProgressCount;
    document.getElementById('statResolvedCount').textContent = resolvedCount;
}

function renderAdminDashboardStats(complaints) {
    renderDashboardStats(complaints);

    document.querySelectorAll('.card-hover-effect[data-status]').forEach(card => {
        card.addEventListener('click', function () {
            const status = this.dataset.status;
            window.location.href = `admin_dashboard.html?status=${status}`;
        });
    });
}

// --- 5. Complaint List Filtering Logic ---

function setupComplaintListFilters(allComplaints, targetElementId, isAdminView = false) {
    const statusSelect = document.getElementById('filterStatus');
    const queryInput = document.getElementById('filterQuery');  // <-- fixed here

    if (!statusSelect || !queryInput) return;

    const applyFilters = () => {
        const statusFilter = statusSelect.value;
        const queryFilter = queryInput.value.toLowerCase();

        let filtered = allComplaints.filter(c => {
            const statusMatch = statusFilter === '' || c.status === statusFilter;
            let queryMatch = c.title.toLowerCase().includes(queryFilter) ||
                             c.category.toLowerCase().includes(queryFilter);

            if (isAdminView && c.submitter) {
                queryMatch = queryMatch || c.submitter.toLowerCase().includes(queryFilter);
            }

            return statusMatch && queryMatch;
        });

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderComplaintList(filtered, targetElementId);
    };

    const urlParams = new URLSearchParams(window.location.search);
    const initialStatus = urlParams.get('status');
    if (initialStatus) {
        statusSelect.value = initialStatus;
    }

    applyFilters();
    statusSelect.addEventListener('change', applyFilters);
    queryInput.addEventListener('input', applyFilters);
}

// --- 6. Dashboard initializers using get_dashboard_stats.php ---

async function initUserDashboard() {
    const user = checkAuth(true);
    if (!user || user.role === 'admin') return;

    try {
        const response = await fetch(`${API_BASE}get_dashboard_stats.php`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error('Failed to load dashboard stats:', data.message);
            return;
        }

        const welcomeEl = document.getElementById('welcomeUserName');
        if (welcomeEl) {
            welcomeEl.textContent = data.user_name || 'User';
        }

        const openCount       = data.stats.open ?? 0;
        const inProgressCount = data.stats.in_progress ?? 0;
        const resolvedCount   = data.stats.resolved ?? 0;
        const totalCount      = openCount + inProgressCount + resolvedCount;

        const elTotal      = document.getElementById('statTotalCount');
        const elOpen       = document.getElementById('statOpenCount');
        const elInProgress = document.getElementById('statInProgressCount');
        const elResolved   = document.getElementById('statResolvedCount');

        if (elTotal)      elTotal.textContent      = totalCount;
        if (elOpen)       elOpen.textContent       = openCount;
        if (elInProgress) elInProgress.textContent = inProgressCount;
        if (elResolved)   elResolved.textContent   = resolvedCount;

        const recentList = document.getElementById('recentComplaintsList');
        if (recentList) {
            recentList.innerHTML = '';
            if (!data.recent || data.recent.length === 0) {
                recentList.innerHTML = '<li class="list-group-item text-muted">No recent complaints.</li>';
            } else {
                data.recent.forEach(item => {
                    const li = document.createElement('a');
                    li.href = `complaint_detail.html?id=${item.id}`;
                    li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3';
                    li.innerHTML = `
                        <div>
                            <h6 class="mb-1 fw-bold text-primary">${item.title} (ID: ${item.id})</h6>
                            <div class="small text-muted">
                                ${item.category} • ${timeSince(item.submission_date)}
                            </div>
                        </div>
                        <div>
                            <span class="badge bg-${badgeForStatus(item.status)} text-white badge-status">
                                ${capitalize(item.status)}
                            </span>
                        </div>
                    `;
                    recentList.appendChild(li);
                });
            }
        }
    } catch (e) {
        console.error('Error loading dashboard:', e);
    }
}

async function initAdminDashboard() {
    const user = checkAuth(true);
    if (!user || user.role !== 'admin') return;

    const complaints = await fetchComplaints();
    renderAdminDashboardStats(complaints);
    setupComplaintListFilters(complaints, 'complaintsListBody', true);
}

// --- 7. INITIALIZATION LOGIC ---

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('loadingMessage')?.remove();

    const pageTitle = document.querySelector('title')?.textContent || '';
    const isLoginPage = pageTitle.includes('Login');

    // For login page, avoid redirect loop: do not call checkAuth()
    const user = isLoginPage ? getUser() : checkAuth();

    // Always render navbar
    renderNavBar(user);

    // If not logged in and not on login/register/index, stop (checkAuth already redirected)
    if (!user && !isLoginPage && !pageTitle.includes('Register') && !pageTitle.includes('SCMS — Home')) {
        return;
    }

    let allComplaints = [];
    if (user && !isLoginPage) {
        allComplaints = await fetchComplaints();
    }

    // Login Page
    if (isLoginPage) {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                if (!form.checkValidity()) {
                    form.classList.add('was-validated');
                    return;
                }

                renderMessage('loginMessage', 'Logging in...', false);

                try {
                    const response = await fetch(`${API_BASE}login.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const responseText = await response.text();

                    if (!response.ok) {
                        console.error(
                            'Login API returned non-OK status:',
                            response.status,
                            'Raw Response:',
                            responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
                        );
                        renderMessage(
                            'loginMessage',
                            `Login failed (Server error: HTTP ${response.status}). Check browser console for Raw Response.`,
                            true
                        );
                        return;
                    }

                    let result;
                    try {
                        result = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.error('Login Failed: JSON parsing error.', jsonError);
                        console.error(
                            'Server returned non-JSON content. Raw Response:',
                            responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
                        );
                        renderMessage(
                            'loginMessage',
                            'Login failed: Server returned an invalid response (likely a PHP error/warning). Check console for full raw output.',
                            true
                        );
                        return;
                    }

                    if (result.success) {
                        sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
                        console.log('Login successful. Redirecting...');
                        window.location.href =
                            result.user.role === 'admin' ? 'admin_dashboard.html' : 'dashboard.html';
                    } else {
                        const errorMessage =
                            result.message || 'Login failed. Check your email and password.';
                        renderMessage('loginMessage', errorMessage, true);
                    }
                } catch (e) {
                    console.error('Login Network Error:', e);
                    renderMessage(
                        'loginMessage',
                        'Network connection failed. Please check your connection and API path.',
                        true
                    );
                }
            });
        }

        return; // no other initializers on login page
    }

    // Register Page
    if (pageTitle.includes('Register')) {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!form.checkValidity()) {
                    form.classList.add('was-validated');
                    return;
                }

                const formData = Object.fromEntries(new FormData(form).entries());
                renderMessage('registerMessage', 'Registering...', false);

                try {
                    const response = await fetch(`${API_BASE}register.php`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });

                    if (!response.ok) {
                        console.error('Register API returned non-OK status:', response.status);
                        renderMessage(
                            'registerMessage',
                            `Registration failed (Server error, HTTP ${response.status}). Please try again.`,
                            true
                        );
                        return;
                    }

                    let result;
                    try {
                        result = await response.json();
                    } catch (jsonError) {
                        console.error('Register Failed: JSON parsing error.', jsonError);
                        renderMessage(
                            'registerMessage',
                            'Registration failed: Server returned an invalid response (likely a PHP error).',
                            true
                        );
                        return;
                    }

                    if (result.success) {
                        renderMessage(
                            'registerMessage',
                            result.message + ' Redirecting to login...',
                            false
                        );
                        setTimeout(() => (window.location.href = 'login.html'), 1500);
                    } else {
                        renderMessage('registerMessage', result.message, true);
                    }
                } catch (e) {
                    renderMessage('registerMessage', 'Network error. Please try again.', true);
                }
            });
        }
    }

    // Submit Complaint Page
    if (pageTitle.includes('Submit Complaint')) {
        const form = document.getElementById('complaintForm');

        const imagesInput = document.getElementById('images');
        const previewDiv = document.getElementById('preview');
        if (imagesInput && previewDiv) {
            imagesInput.addEventListener('change', (event) => {
                previewDiv.innerHTML = '';
                const files = event.target.files;
                if (files.length > 4) {
                    renderMessage('complaintMessage', 'You can only upload up to 4 images.', true);
                    imagesInput.value = '';
                    return;
                }
                renderMessage('complaintMessage', '', false);

                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewDiv.innerHTML += `
                            <img src="${e.target.result}" style="height: 80px; width: 80px; object-fit: cover;"
                                 class="rounded img-thumbnail" alt="Image preview">
                        `;
                    };
                    reader.readAsDataURL(file);
                });
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!form.checkValidity()) {
                    form.classList.add('was-validated');
                    return;
                }

                const formData = new FormData(form);
                renderMessage('complaintMessage', 'Submitting complaint...', false);

                try {
                    const response = await fetch(`${API_BASE}submit_complaint.php`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        console.error('Submit Complaint API returned non-OK status:', response.status);
                        renderMessage(
                            'complaintMessage',
                            `Submission failed (Server error, HTTP ${response.status}). Please try again.`,
                            true
                        );
                        return;
                    }

                    let result;
                    try {
                        result = await response.json();
                    } catch (jsonError) {
                        console.error('Submit Complaint Failed: JSON parsing error.', jsonError);
                        renderMessage(
                            'complaintMessage',
                            'Submission failed: Server returned an invalid response (likely a PHP error).',
                            true
                        );
                        return;
                    }

                    if (result.success) {
                        renderMessage(
                            'complaintMessage',
                            result.message + ' Redirecting to dashboard...',
                            false
                        );
                        sessionStorage.removeItem(ALL_COMPLAINTS_KEY);
                        form.reset();
                        document.getElementById('preview').innerHTML = '';
                        setTimeout(() => (window.location.href = 'dashboard.html'), 1500);
                    } else {
                        renderMessage('complaintMessage', result.message, true);
                    }
                } catch (e) {
                    renderMessage('complaintMessage', 'Network error. Please try again.', true);
                }
            });
        }
    }

    // Dashboard Page (User)
    if (pageTitle.includes('Dashboard') && user && user.role !== 'admin') {
        await initUserDashboard();
    }

    // Dashboard Page (Admin)
    if (pageTitle.includes('Admin Dashboard') && user) {
        await initAdminDashboard();
    }

    // Complaints List Page (User)
    if (pageTitle.includes('My Complaints') && user) {
        setupComplaintListFilters(allComplaints, 'complaintsListBody', false);
    }

    // Complaint Detail Page
    if (pageTitle.includes('Complaint Details') && user) {
        const urlParams = new URLSearchParams(window.location.search);
        const complaintId = parseInt(urlParams.get('id'));

        console.log('Detail page complaintId =', complaintId);

        let complaint = allComplaints.find(c => c.id === complaintId);
        console.log('From allComplaints:', complaint);

        if (!complaint) {
            try {
                const response = await fetch(`${API_BASE}get_complaints.php?id=${complaintId}`);
                const result = await response.json();
                console.log('Single complaint API result:', result);
                if (response.ok && result.success) {
                    complaint = Array.isArray(result.data) ? result.data[0] : result.data;
                }
            } catch (e) {
            }
        }

        console.log('Final complaint passed to renderComplaintDetail:', complaint);
        renderComplaintDetail(complaint);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const adminWorkspace = document.getElementById('adminWorkspace');
    
    const loginForm = document.getElementById('loginForm');
    const loginStatus = document.getElementById('loginStatus');
    
    const logoutBtn = document.getElementById('logoutBtn');
    
    const createAccountForm = document.getElementById('createAccountForm');
    const createAccountStatus = document.getElementById('createAccountStatus');
    
    const createVoucherForm = document.getElementById('createVoucherForm');
    const voucherTrialsSelect = document.getElementById('voucherTrials');
    const voucherCostInput = document.getElementById('voucherCost');
    const createVoucherStatus = document.getElementById('createVoucherStatus');
    
    const usersTableBody = document.getElementById('usersTableBody');
    const vouchersTableBody = document.getElementById('vouchersTableBody');

    const ADMIN_API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:' || window.location.port === '5050') 
        ? 'https://precision-axis-admin.netlify.app' 
        : '';

    async function safeFetchJson(url, options) {
        try {
            const res = await fetch(url, options);
            const text = await res.text();
            let data = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Non-JSON response:', text);
            }
            return { ok: res.ok, status: res.status, data };
        } catch (e) {
            console.error('Network request error:', e);
            return { ok: false, status: 0, data: { error: e.message || 'Network error' } };
        }
    }

    const maintStatusBadge = document.getElementById('maintStatusBadge');
    const toggleMaintBtn = document.getElementById('toggleMaintBtn');
    let isMaintenanceActive = false;

    function updateMaintenanceUI(active) {
        if (!maintStatusBadge || !toggleMaintBtn) return;
        if (active) {
            maintStatusBadge.textContent = 'UNDER MAINTENANCE';
            maintStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            maintStatusBadge.style.color = '#ef4444';
            maintStatusBadge.style.borderColor = '#ef4444';
            toggleMaintBtn.textContent = 'Disable Maintenance (Go Live)';
            toggleMaintBtn.style.background = '#10b981';
            toggleMaintBtn.style.borderColor = '#10b981';
            toggleMaintBtn.style.color = '#ffffff';
        } else {
            maintStatusBadge.textContent = 'SITE LIVE';
            maintStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            maintStatusBadge.style.color = '#10b981';
            maintStatusBadge.style.borderColor = '#10b981';
            toggleMaintBtn.textContent = 'Enable Maintenance';
            toggleMaintBtn.style.background = '#ffb300';
            toggleMaintBtn.style.borderColor = '#ffb300';
            toggleMaintBtn.style.color = '#000000';
        }
    }

    if (toggleMaintBtn) {
        toggleMaintBtn.addEventListener('click', async () => {
            const nextState = !isMaintenanceActive;
            const confirmMsg = nextState 
                ? 'Put site under maintenance? Regular users will see the maintenance notice.' 
                : 'Bring site back live? All regular users will regain access.';
            
            if (!confirm(confirmMsg)) return;

            toggleMaintBtn.disabled = true;
            toggleMaintBtn.textContent = 'Updating...';

            try {
                const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                    },
                    body: JSON.stringify({ action: 'TOGGLE_MAINTENANCE', enabled: nextState })
                });
                if (ok && data && data.success) {
                    isMaintenanceActive = !!data.maintenance;
                    updateMaintenanceUI(isMaintenanceActive);
                } else {
                    alert((data && data.error) || 'Failed to toggle maintenance mode.');
                    updateMaintenanceUI(isMaintenanceActive);
                }
            } catch (e) {
                alert('Connection error toggling maintenance mode.');
                updateMaintenanceUI(isMaintenanceActive);
            } finally {
                toggleMaintBtn.disabled = false;
            }
        });
    }

    // Automatically update cost on trials selection change
    voucherTrialsSelect.addEventListener('change', () => {
        const val = voucherTrialsSelect.value;
        if (val === '3') voucherCostInput.value = '25';
        else if (val === '5') voucherCostInput.value = '70';
        else if (val === '10') voucherCostInput.value = '100';
    });

    // Check auth token
    let adminToken = localStorage.getItem('axis_admin_token');
    if (adminToken) {
        showWorkspace();
    }

    function showWorkspace() {
        loginOverlay.style.display = 'none';
        adminWorkspace.style.display = 'block';
        (window.fetchDatabaseRecords || fetchDatabaseRecords)();
    }

    function showLogin() {
        loginOverlay.style.display = 'flex';
        adminWorkspace.style.display = 'none';
    }

    // Login logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        loginStatus.textContent = 'Authorizing...';
        loginStatus.style.color = 'var(--text-primary)';

        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (ok && data && data.success) {
                localStorage.setItem('axis_admin_token', data.adminToken);
                adminToken = data.adminToken;
                loginStatus.textContent = '';
                showWorkspace();
            } else {
                throw new Error((data && data.error) || 'Invalid credentials');
            }
        } catch (err) {
            loginStatus.textContent = err.message;
            loginStatus.style.color = 'var(--red)';
        }
    });

    // Logout logic
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('axis_admin_token');
        adminToken = null;
        showLogin();
    });

    // Fetch users and vouchers from backend
    async function fetchDatabaseRecords() {
        window.fetchDatabaseRecords = fetchDatabaseRecords;
        if (!localStorage.getItem('axis_admin_token')) return;

        try {
            const { ok, status, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                }
            });
            
            if (status === 401 || status === 403) {
                localStorage.removeItem('axis_admin_token');
                showLogin();
                return;
            }

            if (ok && data && data.success) {
                renderUsers(data.users || []);
                renderVouchers(data.vouchers || []);
                renderPaymentReviews(data.paymentReviews || []);
                isMaintenanceActive = !!data.maintenance;
                updateMaintenanceUI(isMaintenanceActive);
            }
        } catch (err) {
            console.error('Failed to load database records:', err);
        }
    }

    const paymentReviewsTableBody = document.getElementById('paymentReviewsTableBody');
    const pendingReviewCountBadge = document.getElementById('pendingReviewCountBadge');
    const imageViewerModal = document.getElementById('imageViewerModal');
    const fullSizeImg = document.getElementById('fullSizeImg');
    const closeImgModalBtn = document.getElementById('closeImgModalBtn');

    if (closeImgModalBtn) {
        closeImgModalBtn.addEventListener('click', () => {
            imageViewerModal.style.display = 'none';
        });
    }

    window.openImageModal = function(src) {
        fullSizeImg.src = src;
        imageViewerModal.style.display = 'flex';
    };

    function renderPaymentReviews(reviews) {
        if (!paymentReviewsTableBody) return;

        const pendingList = reviews.filter(r => r.status === 'PENDING');
        if (pendingReviewCountBadge) {
            pendingReviewCountBadge.textContent = `${pendingList.length} Pending`;
        }

        if (!reviews.length) {
            paymentReviewsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 20px 0;">No payment proof submissions found.</td></tr>';
            return;
        }

        paymentReviewsTableBody.innerHTML = reviews.map(r => {
            const dateStr = new Date(r.created_at).toLocaleString();
            let statusBadge = `<span class="badge" style="background: rgba(255, 179, 0, 0.2); color: #ffb300;">${r.status}</span>`;
            if (r.status === 'APPROVED') {
                statusBadge = `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981;">APPROVED</span>`;
            } else if (r.status === 'REJECTED') {
                statusBadge = `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">REJECTED</span>`;
            }

            const isVoucher = r.review_type === 'VOUCHER';
            const requestDetail = isVoucher
                ? `<span style="color: #ffb300; font-weight: 800; font-size: 11px;">🎟️ VOUCHER (${r.voucher_trials || 3} TRIALS)</span>`
                : `<span style="color: #60a5fa; font-weight: 800; font-size: 11px;">👤 ACCOUNT SIGNUP</span><br><span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary);">${r.password}</span>`;

            const imgPreview = r.screenshot_data
                ? `<img src="${r.screenshot_data}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #ffb300; cursor: pointer;" onclick="openImageModal('${r.screenshot_data.replace(/'/g, "\\'")}')" title="Click to expand full size screenshot">`
                : '<span style="color: var(--text-secondary); font-size: 11px;">No Image</span>';

            let actions = `<span style="color: var(--text-secondary); font-size: 11px;">Completed</span>`;
            if (r.status === 'PENDING') {
                if (isVoucher) {
                    actions = `<div style="display: flex; gap: 8px; justify-content: flex-end;">
                         <button class="action-btn unblock" style="background: #ffb300; color: #000; font-weight: 900;" onclick="approveVoucherReview(${r.id})">Approve & Generate Voucher</button>
                         <button class="action-btn block" style="background: #ef4444; color: #fff; font-weight: 800;" onclick="rejectPaymentReview(${r.id})">Reject</button>
                       </div>`;
                } else {
                    actions = `<div style="display: flex; gap: 8px; justify-content: flex-end;">
                         <button class="action-btn unblock" style="background: #10b981; color: #fff; font-weight: 800;" onclick="approvePaymentReview(${r.id})">Approve & Create Account</button>
                         <button class="action-btn block" style="background: #ef4444; color: #fff; font-weight: 800;" onclick="rejectPaymentReview(${r.id})">Reject</button>
                       </div>`;
                }
            }

            return `
                <tr>
                    <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                    <td><strong style="color: #fff;">${r.email}</strong></td>
                    <td>${requestDetail}</td>
                    <td>${imgPreview}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">${actions}</td>
                </tr>
            `;
        }).join('');
    }

    window.approveVoucherReview = async function(reviewId) {
        if (!confirm('Approve this voucher purchase? This will generate a unique voucher code and email it to the user.')) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || ''),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'APPROVE_VOUCHER_REVIEW', reviewId })
            });

            if (ok && data.success) {
                alert(data.message);
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert(data.error || 'Failed to approve voucher purchase.');
            }
        } catch (e) {
            alert('Error approving voucher purchase: ' + e.message);
        }
    };

    window.approvePaymentReview = async function(reviewId) {
        if (!confirm('Approve this payment proof? This will instantly create the user account and email them their login details.')) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || ''),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'APPROVE_PAYMENT_REVIEW', reviewId })
            });

            if (ok && data.success) {
                alert(data.message);
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert(data.error || 'Failed to approve payment.');
            }
        } catch (e) {
            alert('Error approving payment proof: ' + e.message);
        }
    };

    window.rejectPaymentReview = async function(reviewId) {
        if (!confirm('Reject this payment proof submission?')) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || ''),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'REJECT_PAYMENT_REVIEW', reviewId })
            });

            if (ok && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert(data.error || 'Failed to reject payment.');
            }
        } catch (e) {
            alert('Error rejecting payment proof: ' + e.message);
        }
    };

    // Render Users
    function renderUsers(users) {
        if (!users.length) {
            usersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No user accounts found.</td></tr>';
            return;
        }

        usersTableBody.innerHTML = users.map(u => {
            const isBlocked = u.blocked === true;
            const statusBadge = isBlocked 
                ? '<span class="status-badge blocked">Blocked</span>' 
                : '<span class="status-badge active">Active</span>';
            
            const blockActionBtn = isBlocked
                ? `<button class="action-btn unblock" onclick="updateUserBlockStatus('${u.email}', false)">Unblock</button>`
                : `<button class="action-btn block" onclick="updateUserBlockStatus('${u.email}', true)">Block</button>`;

            const syncProfile = u.betting_username 
                ? `<span style="font-size: 12px; color: #fff;">${u.betting_username}</span><br><span style="font-size: 11px; color: var(--text-secondary);">${u.betting_phone || ''}</span>`
                : '<span style="color: var(--text-secondary); font-size: 12px;">Not Linked</span>';

            const activeVoucher = u.active_voucher_code
                ? `<span style="color: var(--gold); font-weight: 700; font-size: 12px;">${u.active_voucher_code}</span><br>
                   <button class="action-btn secondary" style="font-size: 9px; padding: 2px 6px; margin-top: 4px;" onclick="removeVoucherLink('${u.email}')">Drop Link</button>`
                : '<span style="color: var(--text-secondary); font-size: 12px;">None</span>';

            // Avoid showing action buttons for admin itself to prevent self-deletion or self-blocking
            const isAdminRow = u.email.toLowerCase() === 'admin@node.net';
            const actionControls = isAdminRow 
                ? '<span style="color: var(--gold); font-size: 11px; font-weight: 700;">SYSTEM ADMINISTRATOR</span>'
                : `<div style="display: flex; gap: 8px; justify-content: flex-end;">
                      ${blockActionBtn}
                      <button class="action-btn delete" onclick="deleteUserAccount('${u.email}')"><i class="fa-solid fa-trash-can"></i></button>
                   </div>`;

            return `
                <tr>
                    <td><strong style="color: #fff;">${u.email}</strong></td>
                    <td style="font-family: var(--font-mono); font-size: 13px;">${u.password}</td>
                    <td>${syncProfile}</td>
                    <td>${activeVoucher}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">${actionControls}</td>
                </tr>
            `;
        }).join('');
    }

    // Render Vouchers
    function renderVouchers(vouchers) {
        if (!vouchers.length) {
            vouchersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No vouchers found.</td></tr>';
            return;
        }

        vouchersTableBody.innerHTML = vouchers.map(v => {
            const dateStr = new Date(v.created_at).toLocaleDateString() + ' ' + new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const trialsLeft = v.total_trials - v.used_trials;

            return `
                <tr>
                    <td><strong style="color: var(--gold); font-family: var(--font-mono);">${v.code}</strong></td>
                    <td><span style="font-size: 12.5px; color: #fff;">${v.created_by || 'anonymous@node.net'}</span></td>
                    <td>$${parseFloat(v.cost).toFixed(2)}</td>
                    <td style="font-weight: 700;">${trialsLeft} / ${v.total_trials}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                    <td style="text-align: right;">
                        <button class="action-btn delete" onclick="deleteVoucher('${v.code}')"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Create account handler
    createAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;

        createAccountStatus.textContent = 'Registering account...';
        createAccountStatus.style.color = 'var(--text-primary)';

        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'CREATE_ACCOUNT', email, password })
            });
            if (ok && data && data.success) {
                createAccountStatus.textContent = 'Account created successfully!';
                createAccountStatus.style.color = 'var(--green)';
                createAccountForm.reset();
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                throw new Error((data && data.error) || 'Failed to create account');
            }
        } catch (err) {
            createAccountStatus.textContent = err.message;
            createAccountStatus.style.color = 'var(--red)';
        }
    });

    // Create voucher handler
    createVoucherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const trials = parseInt(document.getElementById('voucherTrials').value);
        const cost = parseFloat(document.getElementById('voucherCost').value);
        const email = document.getElementById('voucherUserEmail').value.trim();

        createVoucherStatus.textContent = 'Generating voucher...';
        createVoucherStatus.style.color = 'var(--text-primary)';

        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'CREATE_VOUCHER', trials, cost, email })
            });
            if (ok && data && data.success) {
                createVoucherStatus.textContent = `Generated Code: ${data.code}`;
                createVoucherStatus.style.color = 'var(--green)';
                createVoucherForm.reset();
                // Retain selected values default
                voucherTrialsSelect.value = '3';
                voucherCostInput.value = '25';
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                throw new Error((data && data.error) || 'Failed to generate voucher');
            }
        } catch (err) {
            createVoucherStatus.textContent = err.message;
            createVoucherStatus.style.color = 'var(--red)';
        }
    });

    // Action execution helpers
    window.updateUserBlockStatus = async function(email, blocked) {
        if (!confirm(`Are you sure you want to ${blocked ? 'BLOCK' : 'UNBLOCK'} the user: ${email}?`)) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'UPDATE_BLOCK_STATUS', email, blocked })
            });
            if (ok && data && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + ((data && data.error) || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.deleteUserAccount = async function(email) {
        if (!confirm(`CRITICAL WARNING: Are you sure you want to permanently DELETE user account: ${email}? This cannot be undone.`)) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'DELETE_ACCOUNT', email })
            });
            if (ok && data && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + ((data && data.error) || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.removeVoucherLink = async function(email) {
        if (!confirm(`Are you sure you want to detach the active voucher link from the user: ${email}?`)) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'REMOVE_VOUCHER_LINK', email })
            });
            if (ok && data && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + ((data && data.error) || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.deleteVoucher = async function(code) {
        if (!confirm(`Are you sure you want to delete the voucher code: ${code}?`)) return;
        try {
            const { ok, data } = await safeFetchJson(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'DELETE_VOUCHER', code })
            });
            if (ok && data && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + ((data && data.error) || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };
});


    const signupAttemptsTableBody = document.getElementById('signupAttemptsTableBody');
    const apologyEmailForm = document.getElementById('apologyEmailForm');
    const apologyStatus = document.getElementById('apologyStatus');

    // Render Pre-Payment Signup Attempts
    function renderSignupAttempts(attempts) {
        if (!signupAttemptsTableBody) return;
        if (!attempts || !attempts.length) {
            signupAttemptsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No signup attempt logs recorded.</td></tr>';
            return;
        }

        signupAttemptsTableBody.innerHTML = attempts.map(a => {
            const dateStr = new Date(a.created_at).toLocaleDateString() + ' ' + new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const pwd = a.password || '<span style="color:#888; font-style:italic;">None</span>';
            const escapedEmail = (a.email || '').replace(/'/g, "\'");
            const escapedPwd = (a.password || '').replace(/'/g, "\'");

            return `
                <tr>
                    <td><strong style="color: #fff;">${a.email}</strong></td>
                    <td style="font-family: var(--font-mono); font-size: 13px; color: var(--gold);">${pwd}</td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                    <td style="text-align: right;">
                        <button class="action-btn block" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; font-weight: 700; padding: 4px 10px; font-size: 11px;" onclick="prefillApologyForm('${escapedEmail}', '${escapedPwd}')">
                            <i class="fa-solid fa-paper-plane"></i> Send Apology Email
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.prefillApologyForm = function(email, pwd) {
        const emailInput = document.getElementById('apologyTargetEmail');
        const pwdInput = document.getElementById('apologyCustomPassword');
        if (emailInput) emailInput.value = email;
        if (pwdInput) pwdInput.value = pwd || '';
        if (apologyEmailForm) apologyEmailForm.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle Apology Email & Account Provisioning Submission
    if (apologyEmailForm) {
        apologyEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('apologyTargetEmail').value.trim();
            const password = document.getElementById('apologyCustomPassword').value.trim();

            apologyStatus.innerHTML = '<span style="color: var(--text-primary);"><i class="fa-solid fa-spinner fa-spin"></i> Provisioning account & dispatching apology email via Resend...</span>';

            try {
                const res = await fetch('/.netlify/functions/admin-users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                    },
                    body: JSON.stringify({
                        action: 'SEND_APOLOGY_PROVISION_EMAIL',
                        email,
                        password
                    })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    apologyStatus.innerHTML = `
                        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; padding: 14px; border-radius: 8px; margin-top: 10px; color: #fff;">
                            <strong style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> ${data.message}</strong>
                            <div style="margin-top: 10px; font-size: 13px;">
                                <strong>User Email:</strong> <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${data.email}</code><br>
                                <strong style="margin-top: 4px; display: inline-block;">Temporary Password:</strong> <code style="color: var(--gold); font-weight: 800; font-size: 14px; background: rgba(255,179,0,0.15); padding: 3px 8px; border-radius: 4px; font-family: monospace;">${data.password}</code>
                                <button type="button" onclick="navigator.clipboard.writeText('Email: ${data.email}\nPassword: ${data.password}')" style="margin-left: 10px; padding: 4px 10px; font-size: 11px; background: var(--gold); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 800;">
                                    <i class="fa-solid fa-copy"></i> Copy Credentials
                                </button>
                            </div>
                        </div>
                    `;
                    apologyEmailForm.reset();
                    (window.fetchDatabaseRecords || fetchDatabaseRecords)();
                } else {
                    throw new Error(data.error || 'Failed to dispatch apology email');
                }
            } catch (err) {
                apologyStatus.innerHTML = `<span style="color: var(--red);">Error: ${err.message}</span>`;
            }
        });
    }

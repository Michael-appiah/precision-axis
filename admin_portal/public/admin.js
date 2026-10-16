
// --- GLOBAL DATA & SEARCH ENGINE ---
window.cachedUsers = [];
window.cachedVouchers = [];

function filterAccountsTable(query) {
    const countSpan = document.getElementById('userMatchCount');
    const usersTableBody = document.getElementById('usersTableBody');
    const users = window.cachedUsers || [];

    if (!usersTableBody) return;

    if (!query) {
        window.renderUsers(users);
        if (countSpan) countSpan.textContent = users.length + ' Total Accounts';
        return;
    }

    const filtered = users.filter(u => 
        (u.email || '').toLowerCase().includes(query) ||
        (u.password || '').toLowerCase().includes(query) ||
        (u.betting_username || '').toLowerCase().includes(query) ||
        (u.betting_phone || '').toLowerCase().includes(query) ||
        (u.active_voucher_code || '').toLowerCase().includes(query)
    );
    window.renderUsers(filtered);
    if (countSpan) countSpan.textContent = `Showing ${filtered.length} of ${users.length} Accounts`;
}
window.filterAccountsTable = filterAccountsTable;

document.addEventListener('DOMContentLoaded', () => {
    const ADMIN_API_BASE = window.location.origin.includes('precisionaxis.online') ? '' : 'https://precisionaxis.online';
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

    // Attach Account Search Input Listeners
    const accountSearchInput = document.getElementById('accountSearchInput');
    if (accountSearchInput) {
        accountSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query && window.location.hash !== '#users') {
                window.location.hash = '#users';
            }
            window.filterAccountsTable(query);
        });
    }

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            window.filterAccountsTable(query);
        });
    }

    }

    let supportPollInterval = null;

    function showWorkspace() {
        loginOverlay.style.display = 'none';
        adminWorkspace.style.display = 'block';
        (window.fetchDatabaseRecords || fetchDatabaseRecords)();
        startSupportPolling();
    }

    function showLogin() {
        loginOverlay.style.display = 'flex';
        adminWorkspace.style.display = 'none';
        stopSupportPolling();
    }

    function startSupportPolling() {
        stopSupportPolling(); // clean up first
        fetchSupportUpdates();
        supportPollInterval = setInterval(fetchSupportUpdates, 5000);
    }

    function stopSupportPolling() {
        if (supportPollInterval) {
            clearInterval(supportPollInterval);
            supportPollInterval = null;
        }
    }

    // Login logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        loginStatus.textContent = 'Authorizing...';
        loginStatus.style.color = 'var(--text-primary)';

        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                localStorage.setItem('axis_admin_token', data.adminToken);
                adminToken = data.adminToken;
                loginStatus.textContent = '';
                showWorkspace();
            } else {
                throw new Error(data.error || 'Invalid credentials');
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
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                }
            });
            
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('axis_admin_token');
                showLogin();
                return;
            }

            const data = await res.json();
            if (res.ok && data.success) {
                renderUsers(data.users);
                renderVouchers(data.vouchers);
                updateExecutiveKPIs(data.users, data.vouchers);
                renderVouchers(data.vouchers);
                if (data.signupAttempts) renderSignupAttempts(data.signupAttempts);
                if (typeof data.maintenance !== 'undefined') {
                    updateMaintenanceUI(data.maintenance);
                }
            }
        } catch (err) {
            console.error('Failed to load database records:', err);
        }
    }

    // Render Users
    
    // Render Users across all viewports
    
    // --- EXECUTIVE KPI CALCULATOR & ACTIVITY LOGGER ---
    function updateExecutiveKPIs(users, vouchers) {
        window.updateExecutiveKPIs = updateExecutiveKPIs;
        if (!users || !vouchers) return;

        window.cachedUsers = users;
        window.cachedVouchers = vouchers;

        // Filter out admin@node.net for user counts
        const nonAdminUsers = users.filter(u => (u.email || '').toLowerCase() !== 'admin@node.net');
        const totalUsers = nonAdminUsers.length;
        const paidUsers = nonAdminUsers.filter(u => u.paid_signup === true || u.paid_signup === 'true').length;
        const activeSessionsCount = nonAdminUsers.filter(u => u.paid_signup && (u.email_verified === true || u.email_verified === 'true')).length;

        const totalVouchers = vouchers.length;

        let totalTrialsCount = 0;
        let usedTrialsCount = 0;

        vouchers.forEach(v => {
            totalTrialsCount += (v.total_trials || 0);
            usedTrialsCount += (v.used_trials || 0);
        });

        const kpiTotalUsers = document.getElementById('kpiTotalUsers');
        const kpiPaidUsersRatio = document.getElementById('kpiPaidUsersRatio');
        const kpiTotalVouchers = document.getElementById('kpiTotalVouchers');
        const kpiTrialsConsumed = document.getElementById('kpiTrialsConsumed');
        const kpiActiveSessions = document.getElementById('kpiActiveSessions');
        const diagActiveTokenCount = document.getElementById('diagActiveTokenCount');

        if (kpiTotalUsers) kpiTotalUsers.textContent = totalUsers;
        if (kpiPaidUsersRatio) kpiPaidUsersRatio.textContent = `${paidUsers} paid verified accounts`;
        if (kpiTotalVouchers) kpiTotalVouchers.textContent = totalVouchers;
        if (kpiTrialsConsumed) kpiTrialsConsumed.textContent = `${usedTrialsCount} / ${totalTrialsCount} trials used`;
        if (kpiActiveSessions) kpiActiveSessions.textContent = activeSessionsCount;
        if (diagActiveTokenCount) diagActiveTokenCount.textContent = activeSessionsCount + ' Active';

        // Update Donut Chart
        const donutPercentVal = document.getElementById('donutPercentVal');
        const donutCircle = document.getElementById('donutCircle');
        if (donutPercentVal && donutCircle) {
            const pct = totalTrialsCount > 0 ? Math.round((usedTrialsCount / totalTrialsCount) * 100) : 0;
            donutPercentVal.textContent = pct + '%';
            const offset = 408 - (408 * (pct / 100));
            donutCircle.style.strokeDashoffset = offset;
        }

        addActivityLog('INFO', `Fetched ${totalUsers} user accounts (${activeSessionsCount} active sessions) and ${totalVouchers} vouchers.`);
    }

    function addActivityLog(type, message) {
        const feedList = document.getElementById('activityFeedList');
        if (!feedList) return;
        const badgeClass = type === 'SUCCESS' ? 'badge-success' : (type === 'WARN' ? 'badge-warning' : 'badge-info');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <span class="activity-badge ${badgeClass}">${type}</span>
            <span>${message}</span>
            <span class="activity-time">${timeStr}</span>
        `;
        feedList.insertBefore(item, feedList.firstChild);
        if (feedList.children.length > 15) feedList.removeChild(feedList.lastChild);
    }


    function renderUsers(users) {
        window.renderUsers = renderUsers;
        const targetBodies = document.querySelectorAll('.usersTableBody') || [document.getElementById('usersTableBody')];
        if (!targetBodies.length) return;

        let content = '';
        if (!users || !users.length) {
            content = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">No user accounts found in database.</td></tr>';
        } else {
            content = users.map(u => {
                const isBlocked = u.blocked === true;
                const statusBadge = isBlocked 
                    ? '<span class="status-badge blocked" style="background: var(--red-dim); color: var(--red); padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800;">Blocked</span>' 
                    : '<span class="status-badge active" style="background: var(--green-dim); color: var(--green); padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800;">Active</span>';
                
                const blockActionBtn = isBlocked
                    ? `<button class="action-btn unblock" onclick="updateUserBlockStatus('${u.email}', false)">Unblock</button>`
                    : `<button class="action-btn block" onclick="updateUserBlockStatus('${u.email}', true)">Block</button>`;

                const syncProfile = u.betting_username 
                    ? `<span style="font-size: 12px; color: #fff;">${u.betting_username}</span><br><span style="font-size: 11px; color: var(--text-secondary);">${u.betting_phone || ''}</span>`
                    : '<span style="color: var(--text-secondary); font-size: 12px;">Not Linked</span>';

                const activeVoucher = u.active_voucher_code
                    ? `<span style="color: var(--primary-aura); font-weight: 700; font-size: 12px;">${u.active_voucher_code}</span><br>
                       <button class="action-btn secondary" style="font-size: 9px; padding: 2px 6px; margin-top: 4px;" onclick="removeVoucherLink('${u.email}')">Drop Link</button>`
                    : '<span style="color: var(--text-secondary); font-size: 12px;">None</span>';

                const isAdminRow = u.email.toLowerCase() === 'admin@node.net';
                const actionControls = isAdminRow 
                    ? '<span style="color: var(--primary-aura); font-size: 11px; font-weight: 700;">SYSTEM ADMIN</span>'
                    : `<div style="display: flex; gap: 8px; justify-content: flex-end;">
                          ${blockActionBtn}
                          <button class="action-btn block" style="padding: 4px 10px; background: rgba(239,68,68,0.15);" onclick="deleteUserAccount('${u.email}')"><i class="fa-solid fa-trash-can"></i></button>
                       </div>`;

                return `
                    <tr>
                        <td><strong style="color: #fff;">${u.email}</strong></td>
                        <td style="font-family: var(--font-mono); font-size: 12.5px; color: var(--text-secondary);">${u.password || '••••••••'}</td>
                        <td>${syncProfile}</td>
                        <td>${activeVoucher}</td>
                        <td>${statusBadge}</td>
                        <td style="text-align: right;">${actionControls}</td>
                    </tr>
                `;
            }).join('');
        }

        targetBodies.forEach(el => el.innerHTML = content);
    }

    // Render Vouchers across all viewports
    function renderVouchers(vouchers) {
        window.renderVouchers = renderVouchers;
        const targetBodies = document.querySelectorAll('.vouchersTableBody') || [document.getElementById('vouchersTableBody')];
        if (!targetBodies.length) return;

        let content = '';
        if (!vouchers || !vouchers.length) {
            content = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px;">No generated vouchers found in database.</td></tr>';
        } else {
            content = vouchers.map(v => {
                const dateStr = new Date(v.created_at).toLocaleDateString() + ' ' + new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const trialsLeft = (v.total_trials || 0) - (v.used_trials || 0);

                const referenceLine = v.payment_reference 
                    ? `<br><span style="font-size: 10px; color: var(--text-secondary); font-family: var(--font-mono);" title="Paystack Reference">${v.payment_reference}</span>` 
                    : '<br><span style="font-size: 10px; color: #888; font-style: italic;">No payment reference</span>';

                const refundBtn = v.payment_reference 
                    ? `<button class="action-btn block" style="padding: 4px 8px; font-size: 10px; margin-right: 8px;" onclick="refundVoucherByReference('${v.payment_reference}', ${v.cost})">Refund</button>`
                    : '';

                return `
                    <tr>
                        <td><strong style="color: var(--primary-aura); font-family: var(--font-mono);">${v.code}</strong>${referenceLine}</td>
                        <td><span style="font-size: 12.5px; color: #fff;">${v.created_by || 'anonymous@node.net'}</span></td>
                        <td><span style="font-family: var(--font-mono); font-size: 12px;">${v.used_trials || 0} / ${v.total_trials || 0}</span></td>
                        <td><span style="font-family: var(--font-mono); font-weight: 700;">${v.cost || 25}</span></td>
                        <td><span style="font-size: 11px; color: var(--text-secondary);">${dateStr}</span></td>
                        <td style="text-align: right;">
                            ${refundBtn}
                            <button class="action-btn block" style="padding: 4px 8px; font-size: 10px;" onclick="deleteVoucherCode('${v.code}')"><i class="fa-solid fa-trash-can"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        targetBodies.forEach(el => el.innerHTML = content);
    }


    // Create account handler
    createAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;

        createAccountStatus.textContent = 'Registering account...';
        createAccountStatus.style.color = 'var(--text-primary)';

        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'CREATE_ACCOUNT', email, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                createAccountStatus.textContent = 'Account created successfully!';
                createAccountStatus.style.color = 'var(--green)';
                createAccountForm.reset();
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                throw new Error(data.error || 'Failed to create account');
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
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'CREATE_VOUCHER', trials, cost, email })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                createVoucherStatus.textContent = `Generated Code: ${data.code}`;
                createVoucherStatus.style.color = 'var(--green)';
                createVoucherForm.reset();
                // Retain selected values default
                voucherTrialsSelect.value = '3';
                voucherCostInput.value = '25';
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                throw new Error(data.error || 'Failed to generate voucher');
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
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'UPDATE_BLOCK_STATUS', email, blocked })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + (data.error || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.deleteUserAccount = async function(email) {
        if (!confirm(`CRITICAL WARNING: Are you sure you want to permanently DELETE user account: ${email}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'DELETE_ACCOUNT', email })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + (data.error || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.removeVoucherLink = async function(email) {
        if (!confirm(`Are you sure you want to detach the active voucher link from the user: ${email}?`)) return;
        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'REMOVE_VOUCHER_LINK', email })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + (data.error || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    window.deleteVoucher = async function(code) {
        if (!confirm(`Are you sure you want to delete the voucher code: ${code}?`)) return;
        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'DELETE_VOUCHER', code })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Action failed: ' + (data.error || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    // Refund form handler
    const refundForm = document.getElementById('refundForm');
    const refundStatus = document.getElementById('refundStatus');

    if (refundForm) {
        refundForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const reference = document.getElementById('refundReference').value.trim();
            const costVal = document.getElementById('refundCost').value.trim();
            const cost = costVal ? parseFloat(costVal) : null;
            const recipientEmail = document.getElementById('refundRecipientEmail').value.trim() || null;

            refundStatus.textContent = 'Processing refund & sending notification...';
            refundStatus.style.color = 'var(--text-primary)';

            try {
                const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                    },
                    body: JSON.stringify({ action: 'PROCESS_REFUND', reference, cost, recipientEmail })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    refundStatus.textContent = `Refund processed and confirmation email sent!`;
                    refundStatus.style.color = 'var(--green)';
                    refundForm.reset();
                    (window.fetchDatabaseRecords || fetchDatabaseRecords)();
                } else {
                    throw new Error(data.error || 'Refund failed');
                }
            } catch (err) {
                refundStatus.textContent = err.message;
                refundStatus.style.color = 'var(--red)';
            }
        });
    }

    window.refundVoucherByReference = async function(reference, cost) {
        if (!confirm(`Are you sure you want to process a full refund for transaction reference: ${reference} ($${cost})? This will deactivate the associated voucher.`)) return;
        
        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ action: 'PROCESS_REFUND', reference, cost })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert('Refund completed and voucher deactivated successfully!');
                (window.fetchDatabaseRecords || fetchDatabaseRecords)();
            } else {
                alert('Refund failed: ' + (data.error || 'Request rejected'));
            }
        } catch (err) {
            alert('Request failed: ' + err.message);
        }
    };

    // Assurance Email form handler
    const assuranceEmailForm = document.getElementById('assuranceEmailForm');
    const assuranceEmailStatus = document.getElementById('assuranceEmailStatus');

    if (assuranceEmailForm) {
        assuranceEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('assuranceEmail').value.trim();
            const cost = parseFloat(document.getElementById('assuranceCost').value);

            assuranceEmailStatus.textContent = 'Sending assurance email via Resend...';
            assuranceEmailStatus.style.color = 'var(--text-primary)';

            try {
                const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                    },
                    body: JSON.stringify({ action: 'SEND_REFUND_EMAIL', email, cost })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    assuranceEmailStatus.textContent = 'Assurance email dispatched successfully!';
                    assuranceEmailStatus.style.color = 'var(--green)';
                    assuranceEmailForm.reset();
                } else {
                    throw new Error(data.error || 'Failed to dispatch email');
                }
            } catch (err) {
                assuranceEmailStatus.textContent = err.message;
                assuranceEmailStatus.style.color = 'var(--red)';
            }
        });
    }

    // --- CUSTOMER CARE LIVE CHAT SYSTEM ---
    let activeChatEmail = null;
    const supportInboxList = document.getElementById('supportInboxList');
    const supportChatViewport = document.getElementById('supportChatViewport');
    const supportReplyForm = document.getElementById('supportReplyForm');
    const supportReplyInput = document.getElementById('supportReplyInput');
    const supportReplySubmitBtn = document.getElementById('supportReplySubmitBtn');
    const chatActiveUserEmail = document.getElementById('chatActiveUserEmail');
    const chatActiveUserStatus = document.getElementById('chatActiveUserStatus');

    let currentMessagesCount = 0;

    async function fetchSupportUpdates() {
        if (!localStorage.getItem('axis_admin_token')) return;

        try {
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                },
                body: JSON.stringify({ 
                    action: 'GET_SUPPORT_UPDATES', 
                    email: activeChatEmail 
                })
            });

            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('axis_admin_token');
                showLogin();
                return;
            }

            const data = await res.json();
            if (res.ok && data.success) {
                renderSupportInbox(data.conversations);
                
                // If there's active chat, render it too
                if (activeChatEmail && data.messages) {
                    if (data.messages.length !== currentMessagesCount) {
                        currentMessagesCount = data.messages.length;
                        renderSupportChat(data.messages);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load support updates:', err);
        }
    }

    function renderSupportInbox(conversations) {
        if (!conversations || conversations.length === 0) {
            supportInboxList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 30px 10px; font-size: 12.5px;">No active support threads.</div>';
            return;
        }

        supportInboxList.innerHTML = conversations.map(c => {
            const isSelected = activeChatEmail && activeChatEmail.toLowerCase() === c.user_email.toLowerCase();
            const unreadBadge = c.unread_count > 0 
                ? `<span style="background: var(--red); color: #fff; border-radius: 10px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-left: 8px;">${c.unread_count}</span>` 
                : '';
            
            const lastMsgSnippet = c.last_message 
                ? (c.last_message.length > 35 ? c.last_message.substring(0, 35) + '...' : c.last_message)
                : 'No messages yet';

            const activeStyle = isSelected 
                ? 'background: rgba(255, 160, 0, 0.08); border-left: 3px solid var(--gold);' 
                : 'border-left: 3px solid transparent;';

            return `
                <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: background 0.15s; ${activeStyle}" onclick="selectSupportThread('${c.user_email}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #fff; font-size: 12.5px;">${c.user_email}</strong>
                        ${unreadBadge}
                    </div>
                    <span style="font-size: 11.5px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsgSnippet}</span>
                </div>
            `;
        }).join('');
    }

    window.selectSupportThread = async function(email) {
        activeChatEmail = email;
        currentMessagesCount = 0; // force re-render
        
        chatActiveUserEmail.textContent = email;
        chatActiveUserStatus.textContent = 'Active Connection';
        chatActiveUserStatus.style.color = 'var(--green)';

        supportReplyInput.removeAttribute('disabled');
        supportReplySubmitBtn.removeAttribute('disabled');

        // Fetch immediately
        await fetchSupportUpdates();
    };

    function renderSupportChat(messages) {
        if (!messages || messages.length === 0) {
            supportChatViewport.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin: auto; font-size: 13px;">No messages in this conversation.</div>';
            return;
        }

        supportChatViewport.innerHTML = messages.map(m => {
            const isAdmin = m.sender === 'admin';
            
            const alignStyle = isAdmin 
                ? 'align-self: flex-end; background: var(--border); color: #fff;' 
                : 'align-self: flex-start; background: var(--bg-dark); color: #fff; border: 1px solid var(--border);';
            
            const senderLabel = isAdmin 
                ? '<strong style="color: var(--gold); font-size: 10px; display: block; margin-bottom: 2px;">Support Desk (You)</strong>' 
                : '<strong style="color: var(--text-secondary); font-size: 10px; display: block; margin-bottom: 2px;">Customer</strong>';

            const timeStr = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div style="max-width: 70%; padding: 10px 14px; border-radius: 8px; font-size: 13px; line-height: 1.45; ${alignStyle}">
                    ${senderLabel}
                    <div>${m.message}</div>
                    <span style="font-size: 9px; color: var(--text-secondary); display: block; text-align: right; margin-top: 4px;">${timeStr}</span>
                </div>
            `;
        }).join('');

        supportChatViewport.scrollTop = supportChatViewport.scrollHeight;
    }

    if (supportReplyForm) {
        supportReplyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = supportReplyInput.value.trim();
            if (!message || !activeChatEmail) return;

            supportReplyInput.value = '';

            try {
                const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('axis_admin_token') || '')
                    },
                    body: JSON.stringify({ action: 'SEND_SUPPORT_REPLY', email: activeChatEmail, message })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    fetchSupportUpdates();
                } else {
                    alert('Failed to send reply: ' + (data.error || 'Request rejected'));
                }
            } catch (err) {
                console.error('Error sending support reply:', err);
            }
        });
    }

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
                const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
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

    // --- SYSTEM MAINTENANCE MODE CONTROL ---
    const maintenanceToggleBtn = document.getElementById('maintenanceToggleBtn');
    const maintenanceStatus = document.getElementById('maintenanceStatus');
    const maintStatusBadge = document.getElementById('maintStatusBadge');
    let isMaintenanceActive = false;

    function updateMaintenanceUI(active) {
        isMaintenanceActive = !!active;
        if (maintStatusBadge) {
            if (isMaintenanceActive) {
                maintStatusBadge.textContent = 'UNDER MAINTENANCE';
                maintStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
                maintStatusBadge.style.color = '#ef4444';
                maintStatusBadge.style.borderColor = '#ef4444';
            } else {
                maintStatusBadge.textContent = 'SITE LIVE';
                maintStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                maintStatusBadge.style.color = '#10b981';
                maintStatusBadge.style.borderColor = '#10b981';
            }
        }
        if (maintenanceToggleBtn) {
            if (isMaintenanceActive) {
                maintenanceToggleBtn.textContent = 'Disable Maintenance Mode (Bring Site Live)';
                maintenanceToggleBtn.style.background = '#10b981';
                maintenanceToggleBtn.style.borderColor = '#10b981';
                maintenanceToggleBtn.style.color = '#ffffff';
            } else {
                maintenanceToggleBtn.textContent = 'Enable Maintenance Mode';
                maintenanceToggleBtn.style.background = 'var(--red, #ef4444)';
                maintenanceToggleBtn.style.borderColor = 'var(--red, #ef4444)';
                maintenanceToggleBtn.style.color = '#ffffff';
            }
        }
        if (maintenanceStatus) {
            if (isMaintenanceActive) {
                maintenanceStatus.innerHTML = '<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> Maintenance Mode is ACTIVE. Non-admin visitors see the maintenance screen.</span>';
            } else {
                maintenanceStatus.innerHTML = '<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Site is LIVE. All visitors have normal access.</span>';
            }
        }
    }
    window.updateMaintenanceUI = updateMaintenanceUI;

    async function toggleMaintenanceMode() {
        const nextState = !isMaintenanceActive;
        const confirmMsg = nextState
            ? 'Activate Maintenance Mode?\n\nNon-admin visitors to precisionaxis.online will be blocked and shown a maintenance notice.'
            : 'Deactivate Maintenance Mode?\n\nAll visitors will regain normal access to the site.';
        
        if (!confirm(confirmMsg)) return;

        if (maintenanceToggleBtn) {
            maintenanceToggleBtn.disabled = true;
            maintenanceToggleBtn.textContent = 'Updating status...';
        }
        if (maintenanceStatus) {
            maintenanceStatus.innerHTML = '<span style="color: var(--primary-aura);"><i class="fa-solid fa-spinner fa-spin"></i> Communicating with serverless node...</span>';
        }

        try {
            const token = localStorage.getItem('axis_admin_token') || '';
            const res = await fetch(`${ADMIN_API_BASE}/.netlify/functions/admin-users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ action: 'TOGGLE_MAINTENANCE', enabled: nextState })
            });
            const data = await res.json();
            if (res.ok && data && data.success) {
                updateMaintenanceUI(!!data.maintenance);
                if (window.showToast) window.showToast(data.message || 'Maintenance mode updated', 'success');
            } else {
                throw new Error((data && data.error) || 'Failed to update maintenance state');
            }
        } catch (err) {
            console.error('Maintenance toggle error:', err);
            if (maintenanceStatus) {
                maintenanceStatus.innerHTML = `<span style="color: var(--red);"><i class="fa-solid fa-circle-xmark"></i> ${err.message}</span>`;
            }
            updateMaintenanceUI(isMaintenanceActive);
        } finally {
            if (maintenanceToggleBtn) maintenanceToggleBtn.disabled = false;
        }
    }

    if (maintenanceToggleBtn) {
        maintenanceToggleBtn.addEventListener('click', toggleMaintenanceMode);
    }

    const altToggleBtn = document.getElementById('toggleMaintBtn');
    if (altToggleBtn) {
        altToggleBtn.addEventListener('click', toggleMaintenanceMode);
    }

    // Check initial maintenance status on load
    fetch(`${ADMIN_API_BASE}/.netlify/functions/site-status`)
        .then(r => r.json())
        .then(d => {
            if (d && typeof d.maintenance !== 'undefined') {
                updateMaintenanceUI(d.maintenance);
            }
        })
        .catch(() => {});

});


    
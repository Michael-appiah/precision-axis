const http = require('http');
const { Client } = require('pg');

const PORT = 5050;
const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Handle delete user action
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/delete-user') {
        const email = url.searchParams.get('email');
        if (email) {
            const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });
            try {
                await client.connect();
                await client.query('DELETE FROM users WHERE email = $1', [email]);
                res.writeHead(302, { Location: '/' });
                res.end();
                return;
            } catch (err) {
                res.writeHead(500);
                res.end('Database Error: ' + err.message);
                return;
            } finally {
                await client.end();
            }
        }
    }

    // Handle delete voucher action
    if (url.pathname === '/delete-voucher') {
        const code = url.searchParams.get('code');
        if (code) {
            const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });
            try {
                await client.connect();
                await client.query('DELETE FROM vouchers WHERE code = $1', [code]);
                await client.query('UPDATE users SET active_voucher_code = NULL WHERE active_voucher_code = $1', [code]);
                res.writeHead(302, { Location: '/' });
                res.end();
                return;
            } catch (err) {
                res.writeHead(500);
                res.end('Database Error: ' + err.message);
                return;
            } finally {
                await client.end();
            }
        }
    }

    // Handle toggle maintenance action
    if (url.pathname === '/toggle-maintenance') {
        const enabled = url.searchParams.get('enabled') === 'true';
        const valStr = enabled ? 'true' : 'false';
        const client = new Client({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } });
        try {
            await client.connect();
            await client.query(
                `INSERT INTO system_settings (key, value) VALUES ('maintenance_mode', $1)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                [valStr]
            );
            res.writeHead(302, { Location: '/' });
            res.end();
            return;
        } catch (err) {
            res.writeHead(500);
            res.end('Database Error: ' + err.message);
            return;
        } finally {
            await client.end();
        }
    }

    if (url.pathname !== '/') {
        res.writeHead(404);
        res.end('Not Found');
        return;
    }

    // Query DB for users and vouchers
    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    let users = [];
    let vouchers = [];
    let isMaintenance = false;
    let dbError = null;

    try {
        await client.connect();
        const userRes = await client.query('SELECT email, password, paid_signup, email_verified, active_voucher_code, betting_username, betting_phone FROM users ORDER BY email ASC');
        users = userRes.rows;
        
        const voucherRes = await client.query('SELECT code, total_trials, used_trials, cost, created_by FROM vouchers ORDER BY code ASC');
        vouchers = voucherRes.rows;

        const maintRes = await client.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
        isMaintenance = maintRes.rows.length > 0 && maintRes.rows[0].value === 'true';
    } catch (err) {
        dbError = err.message;
    } finally {
        await client.end();
    }

    // Render HTML page
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Precision Axis – Admin Console</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Share+Tech+Mono&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #0c0e11;
                --white: #ffffff;
                --card-bg: #181a1f;
                --red: #ea0725;
                --green: #34c759;
                --border: rgba(255,255,255,0.08);
                --text-secondary: #9299a5;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Outfit', sans-serif;
            }
            body {
                background: var(--bg);
                color: #fff;
                padding: 40px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .admin-container {
                width: 100%;
                max-width: 1000px;
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border);
                padding-bottom: 20px;
            }
            h1 {
                font-size: 24px;
                font-weight: 800;
                letter-spacing: -0.5px;
            }
            h1 span {
                color: var(--red);
            }
            .grid-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
            }
            .stat-card {
                background: var(--card-bg);
                border: 1px solid var(--border);
                padding: 20px;
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .stat-lbl {
                font-size: 11px;
                color: var(--text-secondary);
                text-transform: uppercase;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .stat-val {
                font-size: 28px;
                font-weight: 800;
            }
            .section-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .panel {
                background: var(--card-bg);
                border: 1px solid var(--border);
                border-radius: 8px;
                overflow: hidden;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13.5px;
            }
            th, td {
                padding: 14px 18px;
                border-bottom: 1px solid var(--border);
            }
            th {
                background: rgba(255,255,255,0.02);
                color: var(--text-secondary);
                font-weight: 700;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }
            tr:last-child td {
                border-bottom: none;
            }
            .badge {
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                display: inline-block;
                text-transform: uppercase;
            }
            .badge.active { background: rgba(52, 199, 89, 0.1); color: var(--green); }
            .badge.pending { background: rgba(234, 7, 37, 0.1); color: var(--red); }
            .badge.neutral { background: rgba(255,255,255,0.06); color: var(--text-secondary); }
            .mono {
                font-family: 'Share Tech Mono', monospace;
            }
            .btn-delete {
                background: transparent;
                border: 1px solid rgba(234, 7, 37, 0.3);
                color: var(--red);
                padding: 4px 10px;
                font-size: 11px;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                font-weight: 600;
                transition: background 0.15s;
            }
            .btn-delete:hover {
                background: var(--red);
                color: #fff;
            }
            .error-box {
                background: rgba(234, 7, 37, 0.05);
                border: 1px solid var(--red);
                color: var(--red);
                padding: 16px;
                border-radius: 8px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="admin-container">
            <header>
                <h1>Precision Axis <span>Admin Console</span></h1>
                <div class="mono" style="font-size:12px; color:var(--text-secondary);">Local Node: http://localhost:${PORT}</div>
            </header>

            ${dbError ? `<div class="error-box"><i class="fa-solid fa-triangle-exclamation"></i> Database Error: ${dbError}</div>` : ''}

            <!-- Maintenance Mode Control Banner -->
            <div style="margin-bottom: 20px; border: 2px solid #ffb300; background: rgba(255, 179, 0, 0.04); padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div>
                    <h2 style="font-size: 18px; color: #ffb300; margin-bottom: 4px;">
                        <i class="fa-solid fa-screwdriver-wrench"></i> System Maintenance Mode
                    </h2>
                    <p style="font-size: 13px; color: var(--text-secondary);">
                        When enabled, public visitors will see a scheduled maintenance notice.
                    </p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span style="font-weight: 800; font-family: monospace; padding: 6px 12px; border-radius: 4px; ${isMaintenance ? 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;' : 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981;'}">
                        ${isMaintenance ? 'UNDER MAINTENANCE' : 'SITE LIVE'}
                    </span>
                    <a href="/toggle-maintenance?enabled=${isMaintenance ? 'false' : 'true'}" 
                       style="background: ${isMaintenance ? '#10b981' : '#ffb300'}; color: ${isMaintenance ? '#ffffff' : '#000000'}; font-weight: 800; text-decoration: none; padding: 8px 16px; border-radius: 4px; font-size: 13px;">
                       ${isMaintenance ? 'Disable Maintenance (Go Live)' : 'Enable Maintenance'}
                    </a>
                </div>
            </div>

            <div class="grid-stats">
                <div class="stat-card">
                    <span class="stat-lbl">Total Registered Users</span>
                    <span class="stat-val">${users.length}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-lbl">Active Vouchers Provisioned</span>
                    <span class="stat-val">${vouchers.length}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-lbl">Connected Sync Feeds</span>
                    <span class="stat-val">${users.filter(u => u.betting_username).length}</span>
                </div>
            </div>

            <!-- Users Section -->
            <div>
                <h2 class="section-title"><i class="fa-solid fa-users"></i> User Databases</h2>
                <div class="panel">
                    <table>
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Password</th>
                                <th>Signup Paid</th>
                                <th>Email Status</th>
                                <th>Active Voucher</th>
                                <th>Linked Betting Profile</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary)">No users registered yet</td></tr>' : users.map(u => `
                                <tr>
                                    <td style="font-weight:700;">${u.email}</td>
                                    <td class="mono" style="color: #00b0ff; font-weight: 700;">${u.password}</td>
                                    <td>${u.paid_signup ? '<span class="badge active">Paid</span>' : '<span class="badge pending">Unpaid</span>'}</td>
                                    <td>${u.email_verified ? '<span class="badge active">Verified</span>' : '<span class="badge pending">Pending</span>'}</td>
                                    <td class="mono">${u.active_voucher_code || '<span style="color:var(--text-secondary)">None</span>'}</td>
                                    <td>
                                        ${u.betting_username ? `
                                            <div style="font-size:12px;">
                                                <strong>Name:</strong> ${u.betting_username}<br>
                                                <strong>Phone:</strong> ${u.betting_phone || 'N/A'}
                                            </div>
                                        ` : '<span style="color:var(--text-secondary)">Not linked</span>'}
                                    </td>
                                    <td>
                                        <a href="/delete-user?email=${encodeURIComponent(u.email)}" class="btn-delete" onclick="return confirm('Delete user ${u.email} permanently?')">Delete</a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Vouchers Section -->
            <div>
                <h2 class="section-title"><i class="fa-solid fa-ticket"></i> Active Voucher Keys</h2>
                <div class="panel">
                    <table>
                        <thead>
                            <tr>
                                <th>Voucher Code</th>
                                <th>Remaining Trials</th>
                                <th>Total Cost</th>
                                <th>Provisioned By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vouchers.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No active vouchers created yet</td></tr>' : vouchers.map(v => {
                                const remaining = v.total_trials - v.used_trials;
                                return `
                                    <tr>
                                        <td class="mono" style="font-weight:700; color: #ffe875;">${v.code}</td>
                                        <td>
                                            <strong>${remaining}</strong> / ${v.total_trials} left
                                        </td>
                                        <td>$${v.cost}</td>
                                        <td>${v.created_by}</td>
                                        <td>
                                            <a href="/delete-voucher?code=${encodeURIComponent(v.code)}" class="btn-delete" onclick="return confirm('Delete voucher ${v.code} permanently?')">Delete</a>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    res.writeHead(200);
    res.end(html);
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ADMIN PANEL LOCAL SERVER STATUS: ACTIVE`);
    console.log(`🎯 URL: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});

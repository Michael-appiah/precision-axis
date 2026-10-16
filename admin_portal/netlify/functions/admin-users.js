
function generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PAX-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
    connectionString: DB_CONN,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});


async function sendApologyProvisionEmail(toEmail, password) {
    const RESEND_KEY = process.env.RESEND_API_KEY || '';

    const plainTextContent = `Hello,

Thank you for contacting Precision Axis support regarding your account setup. Your login access has been created.

ACCOUNT CREDENTIALS
Email: ${toEmail}
Temporary Password: ${password}

You can log in to your account at: https://precisionaxis.online/auth.html

If you have any questions or need further assistance, please reply directly to this email.

Best regards,
Precision Axis Support Team
support@precisionaxis.online
Precision Axis Ltd.`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Login Information</title>
</head>
<body style="background-color: #ffffff; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; margin: 0; padding: 32px 16px;">
    <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px;">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Precision Axis</h2>
        
        <p style="font-size: 15px; color: #334155; margin-top: 16px;">Hello,</p>
        
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            Thank you for reaching out regarding your account creation. We apologize for the delay during registration. Your account access has now been provisioned.
        </p>
        
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; margin-bottom: 12px;">Account Credentials</div>
            
            <div style="font-size: 14px; color: #334155; margin-bottom: 8px;">
                <strong>Login Email:</strong> ${toEmail}
            </div>
            <div style="font-size: 14px; color: #334155;">
                <strong>Temporary Password:</strong> <code style="background: #ffffff; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-weight: 700; color: #0f172a; font-family: monospace; font-size: 15px;">${password}</code>
            </div>
        </div>

        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            You can log in to your account using the URL below:
        </p>

        <p style="margin: 20px 0;">
            <a href="https://precisionaxis.online/auth.html" style="background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Log In to Precision Axis</a>
        </p>

        <p style="font-size: 13px; color: #64748b;">
            Direct Login Link: <a href="https://precisionaxis.online/auth.html" style="color: #2563eb;">https://precisionaxis.online/auth.html</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;">

        <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
            This transactional email was sent to ${toEmail} regarding your account request.<br>
            Precision Axis Ltd. &bull; <a href="mailto:support@precisionaxis.online" style="color: #64748b;">support@precisionaxis.online</a>
        </p>
    </div>
</body>
</html>`;

    try {
        // 1. Attempt sending via verified custom domain support@precisionaxis.online
        let response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Precision Axis <support@precisionaxis.online>',
                reply_to: 'support@precisionaxis.online',
                to: [toEmail],
                subject: 'Your Precision Axis Login Information',
                text: plainTextContent,
                html: htmlContent
            })
        });

        let resData = await response.json();

        // 2. If custom domain is unverified on Resend dashboard, fallback to onboarding@resend.dev
        if (!response.ok && (resData.message || '').includes('domain')) {
            response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: 'Precision Axis <onboarding@resend.dev>',
                    reply_to: 'support@precisionaxis.online',
                    to: [toEmail],
                    subject: 'Your Precision Axis Login Information',
                    text: plainTextContent,
                    html: htmlContent
                })
            });
            resData = await response.json();
        }

        return resData;
    } catch (e) {
        console.error('Failed to send apology email:', e);
        return { error: e.message };
    }
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // 1. Verify Admin Token via Authorization Header
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Missing admin authorization header.' }) };
    }
    
    const adminToken = authHeader.split(' ')[1];

    let client;

    try {
        client = await pool.connect();

        // Validate token belongs to admin@node.net
        const adminCheck = await client.query(
            'SELECT id FROM users WHERE email = $1 AND session_token = $2',
            ['admin@node.net', adminToken]
        );
        if (adminCheck.rows.length === 0) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Access denied. Unauthorized admin token.' }) };
        }

        // GET — Retrieve users, vouchers, payment reviews, and system maintenance status (High-Speed Pool Parallel Execution)
        if (event.httpMethod === 'GET') {
            const [usersRes, vouchersRes, reviewsRes, attemptsRes, maintRes, txRes] = await Promise.all([
                pool.query('SELECT email, password, paid_signup, email_verified, betting_username, betting_phone, active_voucher_code, blocked FROM users ORDER BY id DESC LIMIT 200'),
                pool.query('SELECT code, total_trials, used_trials, cost, created_by, created_at, payment_reference FROM vouchers ORDER BY id DESC LIMIT 200'),
                pool.query('SELECT id, email, password, status, review_type, voucher_trials, created_at FROM payment_reviews ORDER BY id DESC LIMIT 100'),
                pool.query('SELECT id, email, password, created_at FROM signup_attempts ORDER BY id DESC LIMIT 100'),
                pool.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'"),
                pool.query("SELECT COALESCE(SUM(amount_ghs), 0) AS total_ghs, COALESCE(SUM(amount_usd), 0) AS total_usd FROM transactions WHERE LOWER(email) != 'admin@node.net'")
            ]);

            const isMaintenance = maintRes.rows.length > 0 && maintRes.rows[0].value === 'true';
            const realRevGHS = parseFloat(txRes.rows[0]?.total_ghs || 0);
            const realRevUSD = parseFloat(txRes.rows[0]?.total_usd || 0);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    users: usersRes.rows,
                    vouchers: vouchersRes.rows,
                    paymentReviews: reviewsRes.rows,
                    signupAttempts: attemptsRes.rows,
                    maintenance: isMaintenance,
                    realRevenueGHS: realRevGHS,
                    realRevenueUSD: realRevUSD
                })
            };
        }

        // POST — Handle admin actions
        if (event.httpMethod === 'POST') {
            let body;
            try {
                body = JSON.parse(event.body || '{}');
            } catch (e) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
            }

            const { action, email, password, trials, cost, blocked, code, reference, recipientEmail, message, enabled, reviewId } = body;

            // Action: APPROVE_VOUCHER_REVIEW
            if (action === 'APPROVE_VOUCHER_REVIEW') {
                if (!reviewId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reviewId' }) };

                const revRes = await client.query('SELECT * FROM payment_reviews WHERE id = $1', [reviewId]);
                if (revRes.rows.length === 0) {
                    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Review request not found' }) };
                }

                const rev = revRes.rows[0];
                const targetEmail = rev.email.toLowerCase().trim();
                const trialsCount = parseInt(rev.voucher_trials || 3, 10);
                const voucherCost = trialsCount === 3 ? 25 : (trialsCount === 5 ? 70 : 100);

                // Generate 12-char unique voucher code: AXIS-XXXX-XXXX
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                const part1 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                const part2 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                const voucherCode = `AXIS-${part1}-${part2}`;

                // Insert into vouchers table
                await client.query(
                    `INSERT INTO vouchers (code, total_trials, used_trials, cost, created_by, payment_reference)
                     VALUES ($1, $2, 0, $3, 'ADMIN_REVIEW', $4)`,
                    [voucherCode, trialsCount, voucherCost, `momo_voucher_${reviewId}`]
                );

                // Update payment_reviews status and store generated voucher code
                await client.query("UPDATE payment_reviews SET status = 'APPROVED', voucher_code = $1 WHERE id = $2", [voucherCode, reviewId]);

                // Send email with voucher code
                await sendVoucherEmail(targetEmail, voucherCode, trialsCount);

                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ success: true, message: `Voucher code ${voucherCode} generated and emailed to ${targetEmail}` })
                };
            }

            // Action: APPROVE_PAYMENT_REVIEW
            if (action === 'APPROVE_PAYMENT_REVIEW') {
                if (!reviewId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reviewId' }) };

                const revRes = await client.query('SELECT * FROM payment_reviews WHERE id = $1', [reviewId]);
                if (revRes.rows.length === 0) {
                    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Review request not found' }) };
                }

                const rev = revRes.rows[0];
                const targetEmail = rev.email.toLowerCase().trim();
                const targetPassword = rev.password;

                // Create user account if not exists
                const userCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [targetEmail]);
                if (userCheck.rows.length === 0) {
                    await client.query(
                        'INSERT INTO users (email, password, paid_signup, email_verified, verification_code) VALUES ($1, $2, true, true, $3)',
                        [targetEmail, targetPassword, '123456']
                    );
                } else {
                    await client.query(
                        'UPDATE users SET paid_signup = true, email_verified = true, password = $1 WHERE LOWER(email) = LOWER($2)',
                        [targetPassword, targetEmail]
                    );
                }

                // Update review status
                await client.query("UPDATE payment_reviews SET status = 'APPROVED' WHERE id = $1", [reviewId]);

                // Send email with credentials
                await sendAccountCredentialsEmail(targetEmail, targetPassword);

                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ success: true, message: `Account approved and login credentials emailed to ${targetEmail}` })
                };
            }

            // Action: REJECT_PAYMENT_REVIEW
            if (action === 'REJECT_PAYMENT_REVIEW') {
                if (!reviewId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reviewId' }) };
                await client.query("UPDATE payment_reviews SET status = 'REJECTED' WHERE id = $1", [reviewId]);
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ success: true, message: 'Review request rejected' })
                };
            }

            // Action: TOGGLE_MAINTENANCE
            if (action === 'TOGGLE_MAINTENANCE') {
                const valStr = enabled ? 'true' : 'false';
                await client.query(
                    `INSERT INTO system_settings (key, value) VALUES ('maintenance_mode', $1)
                     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
                    [valStr]
                );
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({
                        success: true,
                        maintenance: !!enabled,
                        message: `Maintenance mode ${enabled ? 'ACTIVATED' : 'DEACTIVATED'}.`
                    })
                };
            }

            // Action: CREATE_ACCOUNT
            if (action === 'CREATE_ACCOUNT') {
                if (!email || !password) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email or password' }) };
                }

                // Check if already registered
                const checkUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
                if (checkUser.rows.length > 0) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email already registered.' }) };
                }

                // Create account (already verified & paid)
                await client.query(
                    'INSERT INTO users (email, password, paid_signup, email_verified, verification_code) VALUES ($1, $2, $3, $4, $5)',
                    [email.toLowerCase().trim(), password, true, true, '123456']
                );

                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
            }

            // Action: CREATE_VOUCHER
            if (action === 'CREATE_VOUCHER') {
                if (!trials || !cost) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing trials or cost parameters' }) };
                }

                const targetEmail = (email || '').toLowerCase().trim();

                // Generate and insert voucher code
                const newCode = generateVoucherCode();
                await client.query(
                    'INSERT INTO vouchers (code, total_trials, used_trials, cost, created_by) VALUES ($1, $2, $3, $4, $5)',
                    [newCode, parseInt(trials, 10), 0, parseFloat(cost), targetEmail || 'admin@node.net']
                );

                // If target email is provided, assign active_voucher_code to user
                if (targetEmail) {
                    await client.query(
                        'UPDATE users SET active_voucher_code = $1 WHERE LOWER(email) = LOWER($2)',
                        [newCode, targetEmail]
                    );
                }

                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true, code: newCode }) };
            }

            // Action: UPDATE_BLOCK_STATUS
            if (action === 'UPDATE_BLOCK_STATUS') {
                if (!email || blocked === undefined) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                if (email.toLowerCase().trim() === 'admin@node.net') {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Cannot block system administrator.' }) };
                }

                await client.query('UPDATE users SET blocked = $1 WHERE email = $2', [blocked, email.toLowerCase().trim()]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
            }

            // Action: DELETE_ACCOUNT
            if (action === 'DELETE_ACCOUNT') {
                if (!email) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                if (email.toLowerCase().trim() === 'admin@node.net') {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Cannot delete system administrator.' }) };
                }

                await client.query('DELETE FROM users WHERE email = $1', [email.toLowerCase().trim()]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
            }

            // Action: REMOVE_VOUCHER_LINK
            if (action === 'REMOVE_VOUCHER_LINK') {
                if (!email) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                await client.query('UPDATE users SET active_voucher_code = NULL WHERE email = $1', [email.toLowerCase().trim()]);
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
            }

            // Action: PROCESS_REFUND
            if (action === 'PROCESS_REFUND') {
                if (!reference) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing Paystack transaction reference' }) };
                }

                const PAYSTACK_KEY = process.env.PAYSTACK_SECRET_KEY || '';

                try {
                    const paystackBody = { transaction: reference };
                    if (cost) {
                        // Converted from USD to GHS pesewas
                        paystackBody.amount = Math.round(parseFloat(cost) * 16.0 * 100);
                    }

                    const refundResponse = await fetch('https://api.paystack.co/refund', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${PAYSTACK_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(paystackBody)
                    });
                    const refundData = await refundResponse.json();

                    if (!refundData.status) {
                        return { 
                            statusCode: 400, 
                            headers: CORS, 
                            body: JSON.stringify({ error: refundData.message || 'Paystack refund initiation failed' }) 
                        };
                    }

                    // If refund succeeded, exhaust voucher trials in DB
                    await client.query('UPDATE vouchers SET used_trials = total_trials WHERE payment_reference = $1', [reference]);

                    // Send email notification to recipient or voucher owner
                    if (recipientEmail) {
                        await sendRefundEmail(recipientEmail, cost);
                    } else {
                        // Attempt to query voucher owner
                        const voucherOwnerRes = await client.query(
                            'SELECT created_by, cost FROM vouchers WHERE payment_reference = $1',
                            [reference]
                        );
                        if (voucherOwnerRes.rows.length > 0) {
                            const ownerEmail = voucherOwnerRes.rows[0].created_by;
                            const ownerCost = voucherOwnerRes.rows[0].cost;
                            await sendRefundEmail(ownerEmail, cost || ownerCost);
                        }
                    }

                    return {
                        statusCode: 200,
                        headers: CORS,
                        body: JSON.stringify({ 
                            success: true, 
                            message: refundData.message,
                            refundId: refundData.data.id
                        })
                    };

                } catch (err) {
                    console.error('Paystack refund execution error:', err);
                    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to communicate with Paystack API' }) };
                }
            }

            // Action: SEND_REFUND_EMAIL
            
            // Action: SEND_APOLOGY_PROVISION_EMAIL
            if (action === 'SEND_APOLOGY_PROVISION_EMAIL') {
                if (!email) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing target user email' }) };
                }

                const targetEmail = email.trim().toLowerCase();
                const generatedPassword = (password && password.trim() !== '') ? password.trim() : `Axis-${Math.floor(1000 + Math.random() * 9000)}`;

                // Insert or activate user in DB
                const checkUser = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [targetEmail]);
                if (checkUser.rows.length > 0) {
                    await client.query(
                        'UPDATE users SET password = $1, paid_signup = true, email_verified = true WHERE LOWER(email) = LOWER($2)',
                        [generatedPassword, targetEmail]
                    );
                } else {
                    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                    await client.query(
                        'INSERT INTO users (email, password, paid_signup, verification_code, email_verified) VALUES ($1, $2, $3, $4, $5)',
                        [targetEmail, generatedPassword, true, verificationCode, true]
                    );
                }

                // Send white theme apology email via Resend
                const resendResult = await sendApologyProvisionEmail(targetEmail, generatedPassword);

                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({
                        success: true,
                        email: targetEmail,
                        password: generatedPassword,
                        message: `Apology email sent & account provisioned. Password: ${generatedPassword}`,
                        resendResult
                    })
                };
            }

            if (action === 'SEND_REFUND_EMAIL') {
                if (!email || !cost) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing recipient email or refund amount' }) };
                }

                try {
                    await sendRefundEmail(email, cost);
                    return {
                        statusCode: 200,
                        headers: CORS,
                        body: JSON.stringify({ success: true, message: 'Assurance email sent successfully' })
                    };
                } catch (err) {
                    console.error('Resend email dispatch error:', err);
                    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to send assurance email via Resend' }) };
                }
            }

            // Action: DELETE_VOUCHER
            if (action === 'DELETE_VOUCHER') {
                if (!code) {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                // Remove links first
                await client.query('UPDATE users SET active_voucher_code = NULL WHERE active_voucher_code = $1', [code]);
                // Delete from vouchers registry
                await client.query('DELETE FROM vouchers WHERE code = $1', [code]);
                
                return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
            }

            // Action: GET_SUPPORT_UPDATES
            if (action === 'GET_SUPPORT_UPDATES') {
                // Fetch list of conversations
                const convRes = await client.query(`
                    WITH latest_messages AS (
                        SELECT 
                            user_email, 
                            message, 
                            created_at,
                            ROW_NUMBER() OVER(PARTITION BY user_email ORDER BY id DESC) as rn
                        FROM support_messages
                    )
                    SELECT 
                        m.user_email,
                        COUNT(CASE WHEN m.sender = 'user' AND m.is_read = FALSE THEN 1 END)::int as unread_count,
                        l.message as last_message,
                        l.created_at as last_message_time
                    FROM support_messages m
                    LEFT JOIN latest_messages l ON m.user_email = l.user_email AND l.rn = 1
                    GROUP BY m.user_email, l.message, l.created_at
                    ORDER BY last_message_time DESC
                `);

                let activeChatMessages = null;
                if (email) {
                    const cleanEmail = email.toLowerCase().trim();
                    // Fetch chat history
                    const messagesRes = await client.query(
                        'SELECT sender, message, created_at FROM support_messages WHERE user_email = $1 ORDER BY id ASC',
                        [cleanEmail]
                    );
                    activeChatMessages = messagesRes.rows;

                    // Mark customer's messages as read
                    await client.query(
                        "UPDATE support_messages SET is_read = TRUE WHERE user_email = $1 AND sender = 'user'",
                        [cleanEmail]
                    );
                }

                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ 
                        success: true, 
                        conversations: convRes.rows, 
                        messages: activeChatMessages 
                    })
                };
            }

            // Action: SEND_SUPPORT_REPLY
            if (action === 'SEND_SUPPORT_REPLY') {
                if (!email || !message || message.trim() === '') {
                    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing parameters' }) };
                }

                const insertRes = await client.query(
                    'INSERT INTO support_messages (user_email, sender, message, is_read) VALUES ($1, $2, $3, $4) RETURNING sender, message, created_at',
                    [email.toLowerCase().trim(), 'admin', message.trim(), true]
                );

                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ success: true, message: insertRes.rows[0] })
                };
            }

            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action request.' }) };
        }

        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

    } catch (err) {
        console.error('Admin Console Backend Database Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal database service failure' }) };
    } finally {
        if (client) {
            client.release();
        }
    }
};

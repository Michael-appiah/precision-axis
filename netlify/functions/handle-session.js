const { Client } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { sessionToken, action, code, email } = body;
    
    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 1. Verify user session via DB token check
        let userRes;
        if (sessionToken) {
            userRes = await client.query('SELECT * FROM users WHERE session_token = $1', [sessionToken]);
        } else if (email) {
            userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        }

        if (!userRes || userRes.rows.length === 0) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized session.' }) };
        }

        const user = userRes.rows[0];
        if (user.blocked) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Your account has been blocked by the administrator.' }) };
        }

        // Action: GET_SESSION (Returns authenticated session and active voucher details)
        if (action === 'GET_SESSION') {
            let activeVoucher = null;
            if (user.active_voucher_code) {
                const vRes = await client.query('SELECT * FROM vouchers WHERE code = $1', [user.active_voucher_code]);
                if (vRes.rows.length > 0) {
                    const v = vRes.rows[0];
                    activeVoucher = {
                        code: v.code,
                        remaining: v.total_trials - v.used_trials,
                        total: v.total_trials,
                        cost: parseFloat(v.cost)
                    };
                }
            }

            // Retrieve user's previous voucher purchases
            const historyRes = await client.query(
                'SELECT code, total_trials, used_trials, cost, created_at FROM vouchers WHERE created_by = $1 ORDER BY id DESC',
                [user.email]
            );
            const voucherHistory = historyRes.rows.map(v => ({
                code: v.code,
                total: v.total_trials,
                used: v.used_trials,
                cost: parseFloat(v.cost),
                date: v.created_at
            }));

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    email: user.email,
                    verified: user.email_verified,
                    activeVoucher,
                    voucherHistory,
                    bettingUsername: user.betting_username,
                    bettingPhone: user.betting_phone
                })
            };
        }

        // Action: LINK_BETTING_APP (Links betting app details to user account)
        if (action === 'LINK_BETTING_APP') {
            const { bettingUsername, bettingPhone } = body;
            if (!bettingUsername || !bettingPhone) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing username or phone number' }) };
            }
            await client.query(
                'UPDATE users SET betting_username = $1, betting_phone = $2 WHERE id = $3',
                [bettingUsername, bettingPhone, user.id]
            );
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, bettingUsername, bettingPhone })
            };
        }

        // Action: LINK_VOUCHER (Links verified voucher to user in database)
        if (action === 'LINK_VOUCHER') {
            if (!code) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing voucher code' }) };
            }

            // Verify voucher in database
            const vRes = await client.query('SELECT * FROM vouchers WHERE code = $1', [code]);
            if (vRes.rows.length === 0) {
                return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Invalid voucher code.' }) };
            }

            const voucher = vRes.rows[0];
            await client.query('UPDATE users SET active_voucher_code = $1 WHERE id = $2', [voucher.code, user.id]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    code: voucher.code,
                    remaining: voucher.total_trials - voucher.used_trials,
                    total: voucher.total_trials,
                    cost: parseFloat(voucher.cost)
                })
            };
        }

        // Action: UPDATE_USER (Updates betting username, betting phone, and password)
        if (action === 'UPDATE_USER') {
            const { bettingUsername, bettingPhone, password } = body;
            const updates = [];
            const params = [];
            let index = 1;

            if (bettingUsername !== undefined) {
                updates.push(`betting_username = $${index++}`);
                params.push(bettingUsername);
            }
            if (bettingPhone !== undefined) {
                updates.push(`betting_phone = $${index++}`);
                params.push(bettingPhone);
            }
            if (password !== undefined && password.trim() !== '') {
                // In production it would hash, but let's match the system password logic
                updates.push(`password = $${index++}`);
                params.push(password);
            }

            if (updates.length > 0) {
                params.push(user.id);
                await client.query(
                    `UPDATE users SET ${updates.join(', ')} WHERE id = $${index}`,
                    params
                );
            }

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true })
            };
        }

        // Action: DELETE_VOUCHERS (Deletes multiple selected vouchers from database)
        if (action === 'DELETE_VOUCHERS') {
            const { codes } = body;
            if (!codes || !Array.isArray(codes) || codes.length === 0) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing codes array' }) };
            }
            await client.query('DELETE FROM vouchers WHERE code = ANY($1)', [codes]);
            // Clear reference from users table
            await client.query('UPDATE users SET active_voucher_code = NULL WHERE active_voucher_code = ANY($1)', [codes]);
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true })
            };
        }

        // Action: CLEAR_SESSION (Removes token on logout)
        if (action === 'CLEAR_SESSION') {
            await client.query('UPDATE users SET session_token = NULL WHERE id = $1', [user.id]);
            return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid action parameter' }) };

    } catch (err) {
        console.error('Session management failure:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal database session failure' }) };
    } finally {
        await client.end();
    }
};

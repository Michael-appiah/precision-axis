const { Client } = require('pg');
const { checkRateLimit } = require('./rate-limiter');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    // Rate Limiting Check (Max 10 per minute per IP)
    if (!checkRateLimit(event, 10, 60000)) {
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { code, consume, email } = body;
    if (!code) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Voucher code is required' }) };
    }

    const cleanCode = code.trim();

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        // Find voucher using parameterized query
        const res = await client.query('SELECT * FROM vouchers WHERE code = $1', [cleanCode]);
        if (res.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Invalid voucher code.' }) };
        }

        const voucher = res.rows[0];

        // Consume trial server-side if requested
        if (consume) {
            if (voucher.used_trials >= voucher.total_trials) {
                return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Voucher trials exhausted.' }) };
            }
            
            const updateRes = await client.query(
                'UPDATE vouchers SET used_trials = used_trials + 1 WHERE id = $1 RETURNING total_trials, used_trials, cost, code',
                [voucher.id]
            );
            const updatedVoucher = updateRes.rows[0];
            
            // Link voucher code to user account if email provided
            if (email) {
                await client.query(
                    'UPDATE users SET active_voucher_code = $1 WHERE LOWER(email) = LOWER($2)',
                    [updatedVoucher.code, email.trim()]
                );
            }

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    code: updatedVoucher.code,
                    totalTrials: updatedVoucher.total_trials,
                    usedTrials: updatedVoucher.used_trials,
                    remainingTrials: updatedVoucher.total_trials - updatedVoucher.used_trials
                })
            };
        }

        // Link voucher without consuming trial
        if (email) {
            await client.query(
                'UPDATE users SET active_voucher_code = $1 WHERE LOWER(email) = LOWER($2)',
                [voucher.code, email.trim()]
            );
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                code: voucher.code,
                totalTrials: voucher.total_trials,
                usedTrials: voucher.used_trials,
                remainingTrials: voucher.total_trials - voucher.used_trials
            })
        };
    } catch (err) {
        console.error('Voucher verification error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error' }) };
    } finally {
        await client.end();
    }
};

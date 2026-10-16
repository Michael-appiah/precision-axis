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

    const { email, code, verify } = body;
    if (!email) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email parameter is required' }) };
    }

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        if (verify) {
            // Check verification code
            const res = await client.query('SELECT * FROM users WHERE email = $1 AND verification_code = $2', [email, code]);
            if (res.rows.length === 0) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid verification code.' }) };
            }
            
            // Generate security session token
            const sessionToken = 'paxis_session_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            await client.query('UPDATE users SET email_verified = TRUE, session_token = $1 WHERE email = $2', [sessionToken, email]);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, sessionToken, message: 'Email verification successful!' })
            };
        }

        // Just check email status
        const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'User not found' }) };
        }

        const user = res.rows[0];
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                email: user.email,
                verified: user.email_verified,
                sessionToken: user.session_token,
                activeVoucherCode: user.active_voucher_code
            })
        };

    } catch (err) {
        console.error('Email verification error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Database operations failure' }) };
    } finally {
        await client.end();
    }
};

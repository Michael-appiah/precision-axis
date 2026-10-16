const { Client } = require('pg');
const { checkRateLimit } = require('./rate-limiter');
const { verifyPassword, hashPassword } = require('./password-hasher');

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

    // 1. Rate Limiting Check (Max 5 attempts per minute)
    if (!checkRateLimit(event, 5, 60000)) {
        return {
            statusCode: 429,
            headers: CORS,
            body: JSON.stringify({ error: 'Too many authentication attempts. Please wait 1 minute before trying again.' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { email, password } = body;
    if (!email || !password) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email or password' }) };
    }

    const cleanEmail = email.trim().toLowerCase();

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // 2. Fetch user using parameterized SQL binding
        const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
        if (res.rows.length === 0) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid credentials or Security Phrase.' }) };
        }

        const user = res.rows[0];

        // 3. Verify password securely using timing-safe PBKDF2/SHA-512 & legacy fallback
        const isValidPassword = verifyPassword(user.password, password);
        if (!isValidPassword) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid credentials or Security Phrase.' }) };
        }

        // 4. Upgrade plain-text password to PBKDF2 hash on successful login
        if (!user.password.startsWith('pbkdf2$')) {
            const newHash = hashPassword(password);
            await client.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
        }

        if (user.blocked) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Your account has been restricted by the administrator.' }) };
        }

        if (!user.paid_signup) {
            return { statusCode: 402, headers: CORS, body: JSON.stringify({ error: 'Registration fee unpaid. Access denied.' }) };
        }

        if (!user.email_verified) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Email has not been verified yet.', code: user.verification_code }) };
        }

        // 5. Generate secure session token
        const sessionToken = 'paxis_sess_' + require('crypto').randomBytes(24).toString('hex');
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, user.id]);

        // 6. Return trimmed API response (never leak password hashes or internal database IDs!)
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ 
                success: true, 
                email: user.email, 
                sessionToken,
                activeVoucherCode: user.active_voucher_code 
            })
        };
    } catch (err) {
        console.error('Database login error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal database service error' }) };
    } finally {
        await client.end();
    }
};

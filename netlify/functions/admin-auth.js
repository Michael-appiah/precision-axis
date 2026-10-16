const { Client } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
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

    const email = (body.email || '').toLowerCase().trim();
    const password = (body.password || '').trim();

    if (!email || !password) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email or password' }) };
    }

    if (email !== 'admin@node.net') {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Unauthorized. Not an administrative node.' }) };
    }

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Check if admin user exists, sync password and issue admin session token
        const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        if (res.rows.length === 0) {
            await client.query(
                'INSERT INTO users (email, password, paid_signup, email_verified) VALUES ($1, $2, true, true)',
                [email, password]
            );
        } else {
            await client.query(
                'UPDATE users SET password = $1 WHERE LOWER(email) = LOWER($2)',
                [password, email]
            );
        }

        const adminToken = 'admin_session_' + require('crypto').randomBytes(24).toString('hex');
        await client.query('UPDATE users SET session_token = $1 WHERE LOWER(email) = LOWER($2)', [adminToken, email]);

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ success: true, adminToken })
        };
    } catch (err) {
        console.error('Admin Auth Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal server error during admin authentication' }) };
    } finally {
        await client.end();
    }
};

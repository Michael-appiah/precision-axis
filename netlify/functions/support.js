const { Pool } = require('pg');
const { checkRateLimit } = require('./rate-limiter');

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
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return m;
        }
    });
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    // Rate Limit Check
    if (!checkRateLimit(event, 20, 60000)) {
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many requests. Please wait a moment.' }) };
    }

    let client;

    try {
        client = await pool.connect();

        // Extract token from query or authorization header or body
        let sessionToken = event.headers.authorization || event.headers.Authorization;
        if (sessionToken && sessionToken.startsWith('Bearer ')) {
            sessionToken = sessionToken.split(' ')[1];
        }

        let body = {};
        if (event.httpMethod === 'POST') {
            try {
                body = JSON.parse(event.body || '{}');
            } catch (e) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
            }
            if (!sessionToken) {
                sessionToken = body.sessionToken;
            }
        } else if (event.httpMethod === 'GET') {
            sessionToken = sessionToken || (event.queryStringParameters && event.queryStringParameters.sessionToken);
        }

        if (!sessionToken) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Missing session token.' }) };
        }

        // Verify active session in DB using parameterized query
        const sessionCheck = await client.query('SELECT email, blocked FROM users WHERE session_token = $1', [sessionToken]);
        if (sessionCheck.rows.length === 0) {
            return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid session.' }) };
        }

        const user = sessionCheck.rows[0];
        if (user.blocked) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Account blocked.' }) };
        }

        const userEmail = user.email.toLowerCase().trim();

        // GET — Fetch chat message history for the authenticated user
        if (event.httpMethod === 'GET') {
            const res = await client.query(
                'SELECT sender, message, created_at FROM support_messages WHERE user_email = $1 ORDER BY id ASC LIMIT 200',
                [userEmail]
            );

            // Mark admin messages as read
            await client.query(
                "UPDATE support_messages SET is_read = TRUE WHERE user_email = $1 AND sender = 'admin'",
                [userEmail]
            );

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, messages: res.rows })
            };
        }

        // POST — Send a new customer support message with XSS escaping
        if (event.httpMethod === 'POST') {
            const rawMessage = (body.message || '').trim();
            if (!rawMessage) {
                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Message cannot be empty.' }) };
            }

            const cleanMessage = escapeHtml(rawMessage);

            const insertRes = await client.query(
                'INSERT INTO support_messages (user_email, sender, message, is_read) VALUES ($1, $2, $3, $4) RETURNING sender, message, created_at',
                [userEmail, 'user', cleanMessage, false]
            );

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, message: insertRes.rows[0] })
            };
        }

        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

    } catch (err) {
        console.error('Support API error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Database service failure' }) };
    } finally {
        if (client) {
            client.release();
        }
    }
};

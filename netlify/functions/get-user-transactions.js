const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    let client;
    try {
        const body = JSON.parse(event.body || '{}');
        const { sessionToken, email } = body;

        let userEmail = email ? email.trim().toLowerCase() : null;

        client = await pool.connect();

        if (sessionToken && !userEmail) {
            const sessionRes = await client.query('SELECT user_id FROM sessions WHERE token = $1', [sessionToken]);
            if (sessionRes.rows.length > 0) {
                const userId = sessionRes.rows[0].user_id;
                const userRes = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
                if (userRes.rows.length > 0) {
                    userEmail = userRes.rows[0].email.toLowerCase();
                }
            }
        }

        if (!userEmail) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'User session or email required to fetch transactions.' })
            };
        }

        const txRes = await client.query(
            `SELECT id, review_type, voucher_trials, status, voucher_code, created_at 
             FROM payment_reviews 
             WHERE LOWER(email) = LOWER($1) 
             ORDER BY created_at DESC`,
            [userEmail]
        );

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                success: true,
                email: userEmail,
                transactions: txRes.rows
            })
        };

    } catch (err) {
        console.error('Error fetching user transactions:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error while retrieving transactions.' })
        };
    } finally {
        if (client) client.release();
    }
};

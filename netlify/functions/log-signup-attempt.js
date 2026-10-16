const { Client } = require('pg');
const { checkRateLimit } = require('./rate-limiter');

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

    // Rate Limiting Check (Max 10 per min)
    if (!checkRateLimit(event, 10, 60000)) {
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Rate limit exceeded' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { email, password, phone, status, payment_reference, amount_ghs, error_message } = body;
    if (!email) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email' }) };
    }

    const cleanEmail = email.trim().toLowerCase();
    const attemptStatus = status || 'PENDING_PAYMENT';
    const amount = amount_ghs ? parseFloat(amount_ghs) : 50.00;
    const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        await client.query(`
            CREATE TABLE IF NOT EXISTS signup_attempts (
                id SERIAL PRIMARY KEY,
                email TEXT NOT NULL,
                password TEXT,
                phone TEXT,
                status TEXT DEFAULT 'PENDING_PAYMENT',
                payment_reference TEXT,
                amount_ghs NUMERIC(10,2) DEFAULT 50.00,
                error_message TEXT,
                ip_address TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // If payment_reference provided, check if we should update an existing row or insert
        if (payment_reference) {
            const existing = await client.query('SELECT id FROM signup_attempts WHERE payment_reference = $1 LIMIT 1', [payment_reference]);
            if (existing.rows.length > 0) {
                await client.query(
                    `UPDATE signup_attempts
                     SET status = $1, error_message = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [attemptStatus, error_message || null, existing.rows[0].id]
                );
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({ success: true, updated: true })
                };
            }
        }

        await client.query(
            `INSERT INTO signup_attempts (email, password, phone, status, payment_reference, amount_ghs, error_message, ip_address, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [
                cleanEmail,
                password ? password.trim() : '',
                phone || null,
                attemptStatus,
                payment_reference || null,
                amount,
                error_message || null,
                clientIp
            ]
        );

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        console.error('Log signup attempt error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Database service error' }) };
    } finally {
        await client.end();
    }
};

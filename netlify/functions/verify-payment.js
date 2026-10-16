const { Client } = require('pg');
const crypto = require('crypto');
const { checkRateLimit } = require('./rate-limiter');
const { hashPassword } = require('./password-hasher');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const MARTHA_VERIFY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-verify';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // 1. Rate Limiting Check (Max 10 attempts per minute)
    if (!checkRateLimit(event, 10, 60000)) {
        return {
            statusCode: 429,
            headers: CORS,
            body: JSON.stringify({ error: 'Rate limit exceeded. Please wait 1 minute before retrying verification.' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { reference, email, password } = body;
    let targetEmail = email ? email.trim().toLowerCase() : null;
    let targetPassword = password;

    const isAdmin = targetEmail && targetEmail === 'admin@node.net';

    // 2. Verify payment with Martha Solutions Gateway if not admin
    if (!isAdmin) {
        if (!reference) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing payment reference' }) };
        }
        let isVerified = false;
        try {
            const marthaRes = await fetch(`${MARTHA_VERIFY_URL}?reference=${encodeURIComponent(reference)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const marthaData = await marthaRes.json();

            if (marthaRes.ok && marthaData.status && marthaData.paid === true) {
                isVerified = true;
                const tx = marthaData.transaction || {};
                if (!targetEmail) targetEmail = (tx.customerEmail || '').trim().toLowerCase();
                if (tx.metadata) {
                    if (!targetEmail && tx.metadata.custom_email) targetEmail = tx.metadata.custom_email.trim().toLowerCase();
                    if (!targetPassword && tx.metadata.custom_password) targetPassword = tx.metadata.custom_password;
                }
            }

            if (!isVerified) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Signup fee payment verification failed or unconfirmed by payment gateway.' })
                };
            }
        } catch (err) {
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Payment validation error: ' + err.message }) };
        }
    }

    // 3. Database Connection
    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        if (!targetEmail) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Could not resolve email from payment reference' }) };
        }

        // 4. Retrieve saved password from pre-signup attempts table if missing
        if (!targetPassword) {
            try {
                const attemptRes = await client.query(
                    'SELECT password FROM signup_attempts WHERE LOWER(email) = LOWER($1) ORDER BY id DESC LIMIT 1',
                    [targetEmail]
                );
                if (attemptRes.rows.length > 0) {
                    targetPassword = attemptRes.rows[0].password;
                }
            } catch (e) {
                console.error('Failed to look up signup_attempt:', e);
            }
        }

        if (!targetPassword) {
            targetPassword = crypto.randomBytes(8).toString('hex');
        }

        // 5. Check if user already exists
        const userRes = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [targetEmail]);
        let user;

        if (userRes.rows.length > 0) {
            user = userRes.rows[0];
            const sessionToken = crypto.randomBytes(32).toString('hex');
            await client.query(
                'UPDATE users SET session_token = $1, paid_signup = true, is_active = true, email_verified = true WHERE id = $2',
                [sessionToken, user.id]
            );
            user.session_token = sessionToken;
        } else {
            // Create user
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const hashedPassword = hashPassword(targetPassword);

            const insertRes = await client.query(
                `INSERT INTO users (email, password, role, is_active, email_verified, paid_signup, session_token, created_at)
                 VALUES ($1, $2, 'user', true, true, true, $3, NOW())
                 RETURNING *`,
                [targetEmail, hashedPassword, sessionToken]
            );
            user = insertRes.rows[0];
        }

        // 6. Update signup_attempts table status
        try {
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

            const attCheck = await client.query(
                'SELECT id FROM signup_attempts WHERE payment_reference = $1 OR LOWER(email) = LOWER($2) ORDER BY id DESC LIMIT 1',
                [reference || '', targetEmail]
            );
            if (attCheck.rows.length > 0) {
                await client.query(
                    `UPDATE signup_attempts
                     SET status = 'ACCOUNT_CREATED', payment_reference = $1, error_message = NULL, updated_at = NOW()
                     WHERE id = $2`,
                    [reference || null, attCheck.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO signup_attempts (email, password, status, payment_reference, amount_ghs, created_at, updated_at)
                     VALUES ($1, $2, 'ACCOUNT_CREATED', $3, 50.00, NOW(), NOW())`,
                    [targetEmail, targetPassword, reference || null]
                );
            }
        } catch (attErr) {
            console.error('Failed to update signup_attempts log:', attErr);
        }

        // 7. Record transaction in transactions table
        try {
            await client.query(`
                INSERT INTO transactions (email, amount_ghs, amount_usd, type, status, payment_reference, created_at)
                VALUES ($1, 50.00, 3.50, 'signup_fee', 'SUCCESS', $2, NOW())
            `, [targetEmail, reference || null]);
        } catch (txErr) {
            console.warn('Transaction record warning:', txErr.message);
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                message: 'Account registered and activated successfully via Martha Solutions Gateway.',
                sessionToken: user.session_token,
                email: user.email,
                role: user.role
            })
        };
    } catch (err) {
        console.error('Database error in verify-payment:', err);

        // Fallback: update signup_attempts with PAID_CREATION_FAILED so admin can manually provision
        try {
            if (targetEmail) {
                await client.query(`
                    INSERT INTO signup_attempts (email, password, status, payment_reference, amount_ghs, error_message, created_at, updated_at)
                    VALUES ($1, $2, 'PAID_CREATION_FAILED', $3, 50.00, $4, NOW(), NOW())
                `, [targetEmail, targetPassword || '', reference || null, err.message]);
            }
        } catch(e) {}

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: false,
                paid: true,
                error: 'Payment received successfully (Ref: ' + (reference || 'N/A') + '). Automated setup encountered a delay, but our administrator has logged your details and will activate your account shortly.',
                reference: reference,
                email: targetEmail
            })
        };
    } finally {
        await client.end();
    }
};


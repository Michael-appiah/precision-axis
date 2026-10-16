const { Client } = require('pg');

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    // Paystack charge.success event
    if (payload.event === 'charge.success') {
        const data = payload.data || {};
        const reference = data.reference;
        const metadata = data.metadata || {};
        const customEmail = (metadata.custom_email || data.customer?.email || '').trim().toLowerCase();
        const customPassword = metadata.custom_password || 'UserPass123!';

        if (customEmail) {
            const client = new Client({
                connectionString: DB_CONN,
                ssl: { rejectUnauthorized: false }
            });

            try {
                await client.connect();
                // Check if user already exists
                const checkUser = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [customEmail]);
                if (checkUser.rows.length > 0) {
                    console.log(`[PAYSTACK WEBHOOK] Account already exists for ${customEmail}`);
                } else {
                    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
                    await client.query(
                        'INSERT INTO users (email, password, paid_signup, verification_code, email_verified) VALUES ($1, $2, $3, $4, $5)',
                        [customEmail, customPassword, true, verificationCode, false]
                    );
                    console.log(`[PAYSTACK WEBHOOK] Account automatically provisioned for ${customEmail} via ref ${reference}`);
                }
            } catch (err) {
                console.error('[PAYSTACK WEBHOOK ERROR]', err);
            } finally {
                await client.end();
            }
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};

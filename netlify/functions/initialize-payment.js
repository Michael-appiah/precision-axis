const { Client } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const MARTHA_GATEWAY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-session';

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

    const { email, amount, password, is_voucher, trials } = body;
    if (!email || !amount) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing email or amount' }) };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Log pre-payment signup attempt in Database (if password provided)
    if (password) {
        try {
            const client = new Client({
                connectionString: DB_CONN,
                ssl: { rejectUnauthorized: false }
            });
            await client.connect();
            await client.query(`
                CREATE TABLE IF NOT EXISTS signup_attempts (
                    id SERIAL PRIMARY KEY,
                    email TEXT NOT NULL,
                    password TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await client.query(
                'INSERT INTO signup_attempts (email, password) VALUES ($1, $2)',
                [cleanEmail, password || '']
            );
            await client.end();
        } catch (e) {
            console.error('Failed to log pre-payment attempt:', e);
        }
    }

    // 2. Compute amount and metadata
    const numAmount = parseFloat(amount || 50);
    let ghsAmount;
    let callbackUrl;
    let paymentTitle;
    let merchantRef;

    if (is_voucher) {
        // Convert USD tier cost to GHS (1 USD = 16.00 GHS rate)
        ghsAmount = (numAmount < 200) ? parseFloat((numAmount * 16.00).toFixed(2)) : parseFloat(numAmount.toFixed(2));
        callbackUrl = 'https://precisionaxis.online/pricing.html';
        const trialCount = trials || 3;
        paymentTitle = `AI Prediction Voucher — ${trialCount} Trial${trialCount > 1 ? 's' : ''} (GHS ${ghsAmount.toFixed(2)})`;
        merchantRef = 'MS-VCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    } else {
        // Account Creation Signup Fee -> Fixed 50 GHS
        ghsAmount = (numAmount >= 100) ? parseFloat(numAmount.toFixed(2)) : 50.00;
        callbackUrl = 'https://precisionaxis.online/auth.html';
        paymentTitle = `Account Activation Fee — GHS ${ghsAmount.toFixed(2)}`;
        merchantRef = 'MS-ACC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    try {
        const MARTHA_API_KEY = process.env.MARTHA_GATEWAY_KEY || 'ms_pk_live_default';

        const marthaRes = await fetch(MARTHA_GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': MARTHA_API_KEY
            },
            body: JSON.stringify({
                amount: ghsAmount,
                currency: 'GHS',
                customerEmail: cleanEmail,
                customerName: cleanEmail.split('@')[0],
                merchantName: 'Payment',
                orderId: merchantRef,
                description: paymentTitle,
                returnUrl: callbackUrl,
                cancelUrl: is_voucher ? 'https://precisionaxis.online/pricing.html' : 'https://precisionaxis.online/auth.html',
                metadata: {
                    is_voucher: !!is_voucher,
                    trials: trials || 3,
                    cost: numAmount,
                    custom_email: cleanEmail,
                    custom_password: password || ''
                }
            })
        });

        const marthaData = await marthaRes.json();

        if (marthaRes.ok && marthaData.status && marthaData.checkoutUrl) {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    reference: marthaData.reference || merchantRef,
                    authorization_url: marthaData.checkoutUrl,
                    checkout_url: marthaData.checkoutUrl,
                    paystack_url: marthaData.paystackUrl || marthaData.checkoutUrl,
                    amount_ghs: ghsAmount,
                    currency: 'GHS'
                })
            };
        }

        throw new Error(marthaData.message || 'Payment processor failed to initialize session.');
    } catch (err) {
        console.error('Payment initialization error:', err);
        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({ error: err.message || 'Payment initialization failed.' })
        };
    }
};


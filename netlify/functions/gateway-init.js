const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Merchant-Key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({
    connectionString: DB_CONN,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 2000
});

function generateLocalRef() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'GW-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

// Martha Solutions Payment Gateway — spec: GATEWAY_API.md
const MARTHA_GATEWAY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-session';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
    }

    let client;
    try {
        const body = JSON.parse(event.body || '{}');
        const { amount, email, customer_name, title, merchant_name, merchant_ref, callback_url, cancel_url, metadata } = body;

        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid payment amount in GHS is required.' }) };
        }
        if (!email || !email.includes('@')) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid customer email address is required.' }) };
        }
        const return_callback = callback_url || body.callbackUrl || body.returnUrl || body.return_url;
        if (!return_callback || !return_callback.startsWith('http')) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid callback_url is required.' }) };
        }

        const amountGHS = parseFloat(parseFloat(amount).toFixed(2));
        const cleanEmail = email.trim().toLowerCase();
        const merchantName = (merchant_name || body.merchantName || 'Sporty Games').trim();
        const paymentTitle = (title || ('Wallet Top-Up — ' + merchantName)).trim();
        const merchantRef = (merchant_ref || body.orderId || ('ORD-' + Date.now())).trim();
        const MARTHA_API_KEY = process.env.MARTHA_GATEWAY_KEY || 'ms_pk_live_default';

        // 1. Initialize session via Martha Solutions gateway
        const marthaRes = await fetch(MARTHA_GATEWAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': MARTHA_API_KEY },
            body: JSON.stringify({
                amount: amountGHS,
                currency: 'GHS',
                customerEmail: cleanEmail,
                customerName: customer_name || body.customerName || cleanEmail,
                merchantName: merchantName,
                orderId: merchantRef,
                description: paymentTitle,
                returnUrl: return_callback,
                cancelUrl: cancel_url || body.cancelUrl || return_callback,
                metadata: metadata || body.metadata || {}
            })
        });

        const marthaData = await marthaRes.json();
        if (!marthaRes.ok || !marthaData.status || !marthaData.checkoutUrl) {
            throw new Error(marthaData.message || 'Martha Solutions gateway failed to create session.');
        }

        const checkoutUrl = marthaData.checkoutUrl;
        const gatewayRef = marthaData.reference || generateLocalRef();

        // 2. Record session in DB for audit trail
        client = await pool.connect();
        await client.query(`
            INSERT INTO campus_gateway_transactions (
                gateway_ref, merchant_ref, merchant_name, title, customer_email, customer_name,
                amount_ghs, callback_url, cancel_url, paystack_ref, paystack_auth_url, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12)
            ON CONFLICT DO NOTHING
        `, [
            gatewayRef, merchantRef, merchantName, paymentTitle, cleanEmail,
            (customer_name || body.customerName || '').trim(), amountGHS, return_callback, cancel_url || body.cancelUrl || return_callback,
            gatewayRef, checkoutUrl, JSON.stringify(metadata || body.metadata || {})
        ]);

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                message: 'Payment session initialized via Martha Solutions gateway.',
                gateway_ref: gatewayRef,
                checkout_url: checkoutUrl,
                paystack_url: marthaData.paystackUrl || checkoutUrl,
                amount_ghs: amountGHS,
                currency: 'GHS',
                merchant_ref: merchantRef
            })
        };

    } catch (err) {
        console.error('Gateway Init Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message || 'Gateway session initialization failed.' }) };
    } finally {
        if (client) { try { client.release(); } catch(e) {} }
    }
};


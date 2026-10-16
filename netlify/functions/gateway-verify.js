const { Pool } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

// Martha Solutions verify endpoint — spec: GATEWAY_API.md
const MARTHA_VERIFY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-verify';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    let client;
    try {
        const params = event.queryStringParameters || {};
        const ref = params.reference || params.session || params.gateway_ref || params.trxref || params.transaction_id;

        if (!ref) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing reference or session query parameter.' }) };
        }

        // 1. Check local DB cache first
        client = await pool.connect();
        const txRes = await client.query(`
            SELECT * FROM campus_gateway_transactions
            WHERE gateway_ref = $1 OR paystack_ref = $1 OR merchant_ref = $1
            LIMIT 1
        `, [ref]);

        let tx = txRes.rows.length > 0 ? txRes.rows[0] : null;

        // If already SUCCESS in DB, return immediately
        if (tx && tx.status === 'SUCCESS') {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    status: 'SUCCESS',
                    verified: true,
                    transaction: buildTx(tx),
                    callback_url: tx.callback_url
                })
            };
        }

        // 2. Verify with Martha Solutions gateway
        const marthaRes = await fetch(`${MARTHA_VERIFY_URL}?reference=${encodeURIComponent(ref)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const marthaData = await marthaRes.json();

        if (marthaRes.ok && marthaData.status && marthaData.paid === true) {
            // Update DB to SUCCESS
            if (tx) {
                await client.query(
                    `UPDATE campus_gateway_transactions SET status = 'SUCCESS', updated_at = NOW() WHERE id = $1`,
                    [tx.id]
                );
                tx.status = 'SUCCESS';
            }

            const txData = marthaData.transaction || {};
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    status: 'SUCCESS',
                    verified: true,
                    message: 'Payment verified successfully via Martha Solutions gateway.',
                    transaction: {
                        gateway_ref: txData.reference || ref,
                        merchant_ref: txData.orderId || (tx && tx.merchant_ref) || '',
                        merchant_name: txData.merchantName || (tx && tx.merchant_name) || '',
                        customer_email: txData.customerEmail || (tx && tx.customer_email) || '',
                        customer_name: txData.customerName || (tx && tx.customer_name) || '',
                        amount_ghs: parseFloat(txData.amount || (tx && tx.amount_ghs) || 0),
                        currency: 'GHS',
                        status: 'SUCCESS',
                        paid_at: txData.paidAt || new Date().toISOString()
                    },
                    callback_url: tx ? tx.callback_url : null
                })
            };
        } else {
            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: false,
                    status: 'PENDING',
                    verified: false,
                    message: marthaData.message || 'Payment is pending or unconfirmed.',
                    transaction: {
                        gateway_ref: ref,
                        amount_ghs: tx ? parseFloat(tx.amount_ghs) : null,
                        status: tx ? tx.status : 'UNKNOWN'
                    },
                    callback_url: tx ? tx.callback_url : null
                })
            };
        }

    } catch (err) {
        console.error('Gateway Verify Error:', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message || 'Verification failed.' }) };
    } finally {
        if (client) { try { client.release(); } catch(e) {} }
    }
};

function buildTx(tx) {
    return {
        gateway_ref: tx.gateway_ref,
        merchant_ref: tx.merchant_ref,
        merchant_name: tx.merchant_name,
        customer_email: tx.customer_email,
        customer_name: tx.customer_name,
        amount_ghs: parseFloat(tx.amount_ghs),
        currency: 'GHS',
        status: tx.status,
        created_at: tx.created_at,
        paid_at: tx.updated_at
    };
}


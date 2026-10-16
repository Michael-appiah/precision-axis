const { Client } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const MARTHA_GATEWAY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-session';
const MARTHA_VERIFY_URL = 'https://marthasolutions.site/.netlify/functions/gateway-verify';

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

    const { cost, amount, trials, email, reference, createDirect } = body;
    const finalCost = cost || amount || 25;
    const cleanEmail = (email || '').toLowerCase().trim();

    const isAdmin = cleanEmail === 'admin@node.net';

    // SPECIAL ADMIN BYPASS: admin@node.net automatically generates voucher
    if (isAdmin) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codePart1 = '';
        let codePart2 = '';
        for (let i = 0; i < 4; i++) {
            codePart1 += chars.charAt(Math.floor(Math.random() * chars.length));
            codePart2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const voucherCode = `PAX-${codePart1}-${codePart2}`;
        const numTrials = parseInt(trials || 3, 10);
        const numCost = parseFloat(finalCost);

        const client = new Client({
            connectionString: DB_CONN,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            await client.query(
                'INSERT INTO vouchers (code, total_trials, used_trials, cost, created_by, payment_reference) VALUES ($1, $2, $3, $4, $5, $6)',
                [voucherCode, numTrials, 0, numCost, 'admin@node.net', 'ADMIN_AUTO_BYPASS_' + Date.now()]
            );
            await client.query(
                'UPDATE users SET active_voucher_code = $1 WHERE LOWER(email) = LOWER($2)',
                [voucherCode, 'admin@node.net']
            );
            await client.end();

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({
                    success: true,
                    is_admin_bypass: true,
                    code: voucherCode,
                    trials: numTrials,
                    cost: numCost,
                    message: 'Admin auto-success: Voucher generated instantly.'
                })
            };
        } catch (err) {
            console.error('Admin create voucher DB error:', err);
            return {
                statusCode: 500,
                headers: CORS,
                body: JSON.stringify({ error: 'Failed to record admin voucher: ' + err.message })
            };
        }
    }

    if (!finalCost && !reference) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing cost/amount or reference' }) };
    }

    // Initialize session with Martha Solutions Payment Gateway if no reference provided
    if (!createDirect && !reference) {
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid customer email is required.' }) };
        }

        try {
            const ghsAmount = (finalCost < 200) ? parseFloat((finalCost * 16.00).toFixed(2)) : parseFloat(finalCost.toFixed(2));
            const MARTHA_API_KEY = process.env.MARTHA_GATEWAY_KEY || 'ms_pk_live_default';

            const response = await fetch(MARTHA_GATEWAY_URL, {
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
                    merchantName: 'Precision Axis AI',
                    orderId: 'PAX-V-' + Date.now(),
                    description: `Precision Axis Voucher (${trials || 3} Trials - $${finalCost})`,
                    returnUrl: 'https://precisionaxis.online/pricing.html',
                    cancelUrl: 'https://precisionaxis.online/pricing.html',
                    metadata: {
                        custom_email: cleanEmail,
                        trials: trials || 3,
                        cost: finalCost
                    }
                })
            });

            const data = await response.json();

            if (response.ok && data.status && data.checkoutUrl) {
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({
                        success: true,
                        authorization_url: data.checkoutUrl,
                        checkout_url: data.checkoutUrl,
                        reference: data.reference
                    })
                };
            } else {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: data.message || 'Payment gateway voucher checkout failed' })
                };
            }
        } catch (err) {
            console.error('Martha gateway voucher checkout error:', err);
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to communicate with payment gateway' }) };
        }
    }

    // Verify payment with Martha Solutions gateway for non-admin accounts if reference provided
    let verifiedEmail = cleanEmail;
    let verifiedTrials = trials || 3;
    let verifiedCost = finalCost || 25;

    if (reference) {
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
                verifiedEmail = (tx.customerEmail || cleanEmail).toLowerCase().trim();
                if (tx.metadata) {
                    if (tx.metadata.custom_email) verifiedEmail = tx.metadata.custom_email.toLowerCase().trim();
                    if (tx.metadata.trials) verifiedTrials = tx.metadata.trials;
                    if (tx.metadata.cost) verifiedCost = tx.metadata.cost;
                }
            }

            if (!isVerified) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: 'Voucher payment verification failed or unconfirmed by payment gateway.' })
                };
            }

        } catch (err) {
            console.error('Voucher verification check error:', err);
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Payment validation error: ' + err.message }) };
        }
    }

    // Generate secure random alphanumeric voucher code (e.g. PAX-XXXX-XXXX)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codePart1 = '';
    let codePart2 = '';
    for (let i = 0; i < 4; i++) {
        codePart1 += chars.charAt(Math.floor(Math.random() * chars.length));
        codePart2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const voucherCode = `PAX-${codePart1}-${codePart2}`;

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        // Check if reference already processed
        if (reference) {
            const checkRef = await client.query('SELECT code, total_trials, cost FROM vouchers WHERE payment_reference = $1', [reference]);
            if (checkRef.rows.length > 0) {
                const existing = checkRef.rows[0];
                return {
                    statusCode: 200,
                    headers: CORS,
                    body: JSON.stringify({
                        success: true,
                        code: existing.code,
                        trials: existing.total_trials,
                        cost: parseFloat(existing.cost),
                        already_processed: true
                    })
                };
            }
        }

        const numTrials = parseInt(verifiedTrials, 10);
        const numCost = parseFloat(verifiedCost);
        const ghsAmount = numTrials === 3 ? 400.00 : (numTrials === 5 ? 1120.00 : 1600.00);

        await client.query(
            'INSERT INTO vouchers (code, total_trials, used_trials, cost, created_by, payment_reference) VALUES ($1, $2, $3, $4, $5, $6)',
            [voucherCode, numTrials, 0, numCost, verifiedEmail, reference || null]
        );

        if (verifiedEmail) {
            await client.query(
                'UPDATE users SET active_voucher_code = $1 WHERE LOWER(email) = LOWER($2)',
                [voucherCode, verifiedEmail]
            );
        }

        // Record transaction
        try {
            await client.query(`
                INSERT INTO transactions (email, amount_ghs, amount_usd, type, status, payment_reference, created_at)
                VALUES ($1, $2, $3, 'voucher_purchase', 'SUCCESS', $4, NOW())
            `, [verifiedEmail || 'anonymous', ghsAmount, numCost, reference || null]);
        } catch(txErr) {
            console.warn('Voucher transaction record warning:', txErr.message);
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: true,
                code: voucherCode,
                trials: numTrials,
                cost: numCost
            })
        };
    } catch (err) {
        console.error('Database voucher creation error:', err);

        // Fallback: log to payment_reviews table for admin manual fulfillment
        try {
            await client.query(`
                INSERT INTO payment_reviews (email, status, review_type, voucher_trials, payment_reference, error_message, created_at)
                VALUES ($1, 'PENDING_ADMIN_PROVISION', 'voucher', $2, $3, $4, NOW())
            `, [verifiedEmail || 'unknown', verifiedTrials || 3, reference || null, err.message]);
        } catch(e) {}

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                success: false,
                paid: true,
                error: 'Payment received (Ref: ' + (reference || 'N/A') + '). Voucher creation is being processed by our administrator.',
                reference: reference
            })
        };
    } finally {
        await client.end();
    }
};


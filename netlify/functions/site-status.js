const { Client } = require('pg');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
};

const DB_CONN = 'postgresql://postgres.iujikypubqpcstetwdod:SuperSecurePass542!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    const client = new Client({
        connectionString: DB_CONN,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
        const isMaintenance = res.rows.length > 0 && res.rows[0].value === 'true';

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                maintenance: isMaintenance,
                timestamp: new Date().toISOString()
            })
        };
    } catch (err) {
        console.error('Error fetching site status:', err);
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ maintenance: false, error: 'Database query failed' })
        };
    } finally {
        await client.end();
    }
};

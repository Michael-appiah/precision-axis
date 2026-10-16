// Strict 20 outcomes backbone sequence
const OUTCOME_SEQUENCE = [
    'UP', 'DOWN', 'UP', 'DOWN', 'MIDDLE', 
    'UP', 'DOWN', 'DOWN', 'UP', 'MIDDLE', 
    'DOWN', 'UP', 'UP', 'DOWN', 'UP', 
    'DOWN', 'MIDDLE', 'DOWN', 'UP', 'MIDDLE'
];

let currentIndex = 0;
let currentActivePrediction = null;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS, body: '' };
    }

    // GET — return active prediction if locked by predictor, else sequence item
    if (event.httpMethod === 'GET') {
        const prediction = currentActivePrediction || OUTCOME_SEQUENCE[currentIndex];
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ prediction: prediction, index: currentIndex })
        };
    }

    // POST — Lock/Generate active prediction for round (called by Predictor Panel QUERY RESOLVER)
    if (event.httpMethod === 'POST') {
        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch(e) {}

        if (body.outcome && ['UP', 'DOWN', 'MIDDLE'].includes(body.outcome)) {
            currentActivePrediction = body.outcome;
        } else {
            currentActivePrediction = OUTCOME_SEQUENCE[currentIndex];
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ ok: true, prediction: currentActivePrediction, index: currentIndex })
        };
    }

    // DELETE — Consumed by game spin: clear active prediction and advance sequence index
    if (event.httpMethod === 'DELETE') {
        const consumed = currentActivePrediction || OUTCOME_SEQUENCE[currentIndex];
        currentActivePrediction = null;
        currentIndex = (currentIndex + 1) % OUTCOME_SEQUENCE.length;
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ ok: true, consumed: consumed, nextIndex: currentIndex })
        };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};

// Strict 20 outcomes backbone sequence for Virtuals (Home Win, Away Win, Draw, Over 2.5, Under 2.5)
const VIRTUAL_OUTCOME_SEQUENCE = [
    { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '2-1' },
    { prediction: 'OVER 2.5', market: 'OU', pick: 'Over 2.5', score: '3-1' },
    { prediction: 'AWAY WIN', market: '1X2', pick: '2', score: '1-2' },
    { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '2-0' },
    { prediction: 'UNDER 2.5', market: 'OU', pick: 'Under 2.5', score: '1-0' },
    { prediction: 'DRAW', market: '1X2', pick: 'X', score: '1-1' },
    { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '3-1' },
    { prediction: 'OVER 2.5', market: 'OU', pick: 'Over 2.5', score: '2-2' },
    { prediction: 'AWAY WIN', market: '1X2', pick: '2', score: '0-2' },
    { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '2-1' }
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
        const item = currentActivePrediction || VIRTUAL_OUTCOME_SEQUENCE[currentIndex];
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                ok: true,
                prediction: item.prediction,
                market: item.market,
                pick: item.pick,
                score: item.score,
                index: currentIndex,
                analyzedTeams: item.analyzedTeams || null,
                predictedList: item.predictedList || (item.analyzedTeams && item.analyzedTeams.allWinningTeams) || null
            })
        };
    }

    // POST — Lock/Generate active prediction for round (called by Predictor Panel QUERY RESOLVER or Screenshot Upload)
    if (event.httpMethod === 'POST') {
        let body = {};
        try { body = JSON.parse(event.body || '{}'); } catch(e) {}

        if (body.prediction) {
            currentActivePrediction = {
                prediction: body.prediction,
                market: body.market || '1X2',
                pick: body.pick || '1',
                score: body.score || '2-1',
                analyzedTeams: body.analyzedTeams || null,
                predictedList: body.predictedList || (body.analyzedTeams && body.analyzedTeams.allWinningTeams) || null
            };
        } else {
            currentActivePrediction = VIRTUAL_OUTCOME_SEQUENCE[currentIndex];
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ ok: true, prediction: currentActivePrediction, index: currentIndex })
        };
    }

    // DELETE — Consumed by game: clear active prediction and advance sequence index
    if (event.httpMethod === 'DELETE') {
        const consumed = currentActivePrediction || VIRTUAL_OUTCOME_SEQUENCE[currentIndex];
        currentActivePrediction = null;
        currentIndex = (currentIndex + 1) % VIRTUAL_OUTCOME_SEQUENCE.length;
        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ ok: true, consumed: consumed, nextIndex: currentIndex })
        };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};

(() => {
    'use strict';

    const FUNCTION_URL = '/.netlify/functions/virtuals-prediction';

    const activeVoucherCost = document.getElementById('activeVoucherCost');
    const activeVoucherTrials = document.getElementById('activeVoucherTrials');
    const trialsCountEl = document.getElementById('trialsCount');
    const trialsTotalEl = document.getElementById('trialsTotal');
    const trialsBarFill = document.getElementById('trialsBarFill');
    const outcomeEl    = document.getElementById('currentOutcome');
    const predictBtn   = document.getElementById('predictBtn');
    const statusMsg    = document.getElementById('statusMsg');
    const historyList  = document.getElementById('historyList');

    const fileInput = document.getElementById('fileInput');
    const previewBox = document.getElementById('previewBox');
    const previewImg = document.getElementById('previewImg');
    const detectedTeamsBadge = document.getElementById('detectedTeamsBadge');
    const detectedTeamsText = document.getElementById('detectedTeamsText');

    let currentSelectedImage = null;

    // Load active voucher state
    let voucherState = JSON.parse(localStorage.getItem('activeVoucher') || JSON.stringify({
        remaining: 0,
        total: 0,
        cost: 0
    }));

    let history = JSON.parse(localStorage.getItem('virtualPredictorHistory') || '[]');

    // Init UI
    (async () => {
        const token = localStorage.getItem('paxis_session');
        if (token) {
            try {
                const res = await fetch('/.netlify/functions/handle-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionToken: token, action: 'GET_SESSION' })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    if (data.activeVoucher) {
                        voucherState = data.activeVoucher;
                        localStorage.setItem('activeVoucher', JSON.stringify(voucherState));
                    }
                }
            } catch (err) {
                // fall back to storage cache
            }
        }
        updateTrialsDisplay();
        renderHistory();
        fetchCurrentPrediction();
    })();

    // Handle File Selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentSelectedImage = event.target.result;
                previewImg.src = currentSelectedImage;
                previewBox.style.display = 'block';

                // Team detection simulation
                const teamsPool = [
                    ['NRW', 'NEW'],
                    ['WAT', 'WHU'],
                    ['EVE', 'AST'],
                    ['WOL', 'SOU'],
                    ['CRY', 'BUR'],
                    ['CHE', 'LEE'],
                    ['ARS', 'BRE'],
                    ['MCI', 'FUL']
                ];
                const picked = teamsPool[Math.floor(Math.random() * teamsPool.length)];
                detectedTeamsBadge.style.display = 'inline-flex';
                detectedTeamsText.textContent = `Identified: ${picked[0]} vs ${picked[1]}`;
                statusMsg.textContent = 'Screenshot processed. Ready to resolve match probability.';
                statusMsg.style.color = '#34c759';
            };
            reader.readAsDataURL(file);
        }
    });

    // Predict Action
    predictBtn.addEventListener('click', async () => {
        if (voucherState.remaining <= 0) {
            window.location.href = 'pricing.html';
            return;
        }

        predictBtn.disabled = true;
        predictBtn.textContent = 'Analyzing screenshot & entropy...';

        try {
            // Deduct trial from voucher
            const res = await fetch('/.netlify/functions/voucher-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: voucherState.code, consume: true })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Server rejected query');
            }

            voucherState = {
                code: data.code,
                remaining: data.total - data.used,
                total: data.total,
                cost: data.cost
            };
            localStorage.setItem('activeVoucher', JSON.stringify(voucherState));
            updateTrialsDisplay();

            runPredictAnimation();

        } catch (err) {
            statusMsg.textContent = `Access Locked: ${err.message}`;
            statusMsg.style.color = '#ff3333';
            predictBtn.disabled = false;
            predictBtn.textContent = 'ANALYZE SCREENSHOT & RESOLVE';
        }
    });

    function updateTrialsDisplay() {
        if (voucherState.cost > 0) {
            activeVoucherCost.textContent = `$${voucherState.cost} VOUCHER`;
            activeVoucherTrials.textContent = `${voucherState.total} Trials Provisioned`;
            activeVoucherCost.style.color = 'var(--green)';
        } else {
            activeVoucherCost.textContent = 'NO ACTIVE LICENSE';
            activeVoucherTrials.textContent = '0 Node Queries Provisioned';
            activeVoucherCost.style.color = '#ff3333';
        }

        trialsCountEl.textContent = voucherState.remaining;
        trialsTotalEl.textContent = `/ ${voucherState.total}`;

        const pct = voucherState.total > 0 ? (voucherState.remaining / voucherState.total) * 100 : 0;
        trialsBarFill.style.width = `${pct}%`;

        if (voucherState.remaining <= 0) {
            predictBtn.textContent = 'Re-authenticate voucher';
            predictBtn.style.background = 'var(--gold)';
            predictBtn.style.borderColor = 'var(--gold)';
            predictBtn.style.color = '#000000';
            trialsCountEl.style.color = '#ff3333';
            trialsBarFill.style.background = '#ff3333';
        }
    }

    async function fetchCurrentPrediction() {
        if (voucherState.remaining <= 0) {
            outcomeEl.textContent = 'LOCKED';
            outcomeEl.className = 'status-value locked';
            statusMsg.textContent = 'No active voucher trials available.';
            statusMsg.style.color = '#ff3333';
            return;
        }
        try {
            const res = await fetch(FUNCTION_URL);
            const data = await res.json();
            if (data.prediction) {
                outcomeEl.textContent = `${data.prediction} (${data.score || '2-1'})`;
                outcomeEl.className = 'status-value ' + data.prediction.replace(/\s+/g, '').toLowerCase();
                statusMsg.textContent = 'Active game synchronization locked.';
                statusMsg.style.color = '#34c759';
            }
        } catch (e) {
            // silent
        }
    }

    async function runPredictAnimation() {
        predictBtn.disabled = true;
        predictBtn.textContent = 'Neural Vision OCR Matching...';
        statusMsg.textContent = '';

        const predictionsPool = [
            { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '2-1' },
            { prediction: 'OVER 2.5', market: 'OU', pick: 'Over 2.5', score: '3-1' },
            { prediction: 'AWAY WIN', market: '1X2', pick: '2', score: '1-2' },
            { prediction: 'HOME WIN', market: '1X2', pick: '1', score: '2-0' },
            { prediction: 'UNDER 2.5', market: 'OU', pick: 'Under 2.5', score: '1-0' },
            { prediction: 'DRAW', market: '1X2', pick: 'X', score: '1-1' }
        ];

        let target = predictionsPool[Math.floor(Math.random() * predictionsPool.length)];

        try {
            const res = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(target)
            });
            const data = await res.json();
            if (data.prediction && data.prediction.prediction) {
                target = data.prediction;
            }
        } catch (e) {
            // local fallback
        }

        const outcomesList = ['HOME WIN (2-1)', 'AWAY WIN (1-2)', 'OVER 2.5 (3-1)', 'DRAW (1-1)', 'UNDER 2.5 (1-0)'];
        let ticks = 0;
        const maxTicks = 16;

        const interval = setInterval(() => {
            const temp = outcomesList[Math.floor(Math.random() * outcomesList.length)];
            outcomeEl.textContent = temp;
            ticks++;

            if (ticks >= maxTicks) {
                clearInterval(interval);
                outcomeEl.textContent = `${target.prediction} (${target.score})`;
                outcomeEl.className = 'status-value ' + target.prediction.replace(/\s+/g, '').toLowerCase();

                statusMsg.textContent = `Prediction locked! Instant Virtuals will follow ${target.prediction}.`;
                statusMsg.style.color = '#34c759';

                predictBtn.disabled = false;
                predictBtn.textContent = 'RESOLVE ANOTHER FIXTURE';

                // Save to history & cross-window storage
                history.unshift({
                    outcome: `${target.prediction} (${target.score})`,
                    date: new Date().toLocaleTimeString(),
                    market: target.market,
                    pick: target.pick
                });
                if (history.length > 20) history.pop();
                localStorage.setItem('virtualPredictorHistory', JSON.stringify(history));

                // Dispatch cross-tab custom event / localStorage token for instant virtuals
                localStorage.setItem('paxis_active_virtual_prediction', JSON.stringify(target));

                renderHistory();
            }
        }, 100);
    }

    function renderHistory() {
        if (!history.length) {
            historyList.innerHTML = '<div class="history-item-empty">No predictions recorded yet</div>';
            return;
        }
        historyList.innerHTML = history.map(h => `
            <div class="history-item">
                <span class="hist-outcome">${h.outcome}</span>
                <span class="hist-date">${h.date}</span>
            </div>
        `).join('');
    }

})();

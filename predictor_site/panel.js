(() => {
    'use strict';

    const FUNCTION_URL = '/.netlify/functions/prediction';

    const activeVoucherCost = document.getElementById('activeVoucherCost');
    const activeVoucherTrials = document.getElementById('activeVoucherTrials');
    const trialsCountEl = document.getElementById('trialsCount');
    const trialsTotalEl = document.getElementById('trialsTotal');
    const trialsBarFill = document.getElementById('trialsBarFill');
    const outcomeEl    = document.getElementById('currentOutcome');
    const predictBtn   = document.getElementById('predictBtn');
    const statusMsg    = document.getElementById('statusMsg');
    const historyList  = document.getElementById('historyList');
    const gameSyncNotice = document.getElementById('gameSyncNotice');

    // Load active voucher state
    let voucherState = JSON.parse(localStorage.getItem('activeVoucher') || JSON.stringify({
        remaining: 0,
        total: 0,
        cost: 0
    }));

    let history = JSON.parse(localStorage.getItem('predictorHistory') || '[]');

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
                // ignore, fall back to storage cache
            }
        }
        updateTrialsDisplay();
        renderHistory();
        fetchCurrentPrediction();
    })();

    // Predict or Purchase Action
    predictBtn.addEventListener('click', async () => {
        if (voucherState.remaining <= 0) {
            // Redirect to purchase vouchers
            window.location.href = 'pricing.html';
            return;
        }

        predictBtn.disabled = true;
        predictBtn.textContent = 'Syncing database...';

        try {
            // Secure server-side decrement call in Supabase database
            const res = await fetch('/.netlify/functions/voucher-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: voucherState.code, consume: true })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Server rejected query');
            }

            // Sync updated voucher state locally
            voucherState = {
                code: data.code,
                remaining: data.total - data.used,
                total: data.total,
                cost: data.cost
            };
            localStorage.setItem('activeVoucher', JSON.stringify(voucherState));
            updateTrialsDisplay();

            // Perform prediction roll
            runPredictAnimation();

        } catch (err) {
            statusMsg.textContent = `Access Locked: ${err.message}`;
            statusMsg.style.color = '#ff3333';
            predictBtn.disabled = false;
            predictBtn.textContent = 'QUERY RESOLVER';
        }
    });

    function updateTrialsDisplay() {
        // Update top Active Voucher Card UI
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
        } else {
            predictBtn.textContent = 'QUERY RESOLVER';
            predictBtn.style.background = '';
            predictBtn.style.borderColor = '';
            predictBtn.style.color = '';
            trialsCountEl.style.color = '';
            trialsBarFill.style.background = '';
        }
    }

    async function runPredictAnimation() {
        predictBtn.disabled = true;
        predictBtn.textContent = 'Resolving entropy mapping...';
        statusMsg.textContent = '';

        let targetOutcome = 'UP';
        try {
            const res = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.prediction && ['UP', 'DOWN', 'MIDDLE'].includes(data.prediction)) {
                targetOutcome = data.prediction;
            }
        } catch (e) {
            // Local fallback if offline
            const roll = Math.random();
            targetOutcome = roll < 0.45 ? 'UP' : roll < 0.90 ? 'DOWN' : 'MIDDLE';
        }

        const outcomes = ['UP', 'DOWN', 'MIDDLE'];
        let ticks = 0;
        const maxTicks = 18;
        
        const interval = setInterval(() => {
            const temp = outcomes[Math.floor(Math.random() * outcomes.length)];
            outcomeEl.textContent = temp;
            outcomeEl.className = 'status-value ' + temp.toLowerCase();
            ticks++;

            if (ticks >= maxTicks) {
                clearInterval(interval);
                
                outcomeEl.textContent = targetOutcome;
                outcomeEl.className = 'status-value ' + targetOutcome.toLowerCase();
                
                statusMsg.textContent = 'Key resolved and synchronized with Spin da Bottle game.';
                statusMsg.style.color = '#00ff66';

                if (gameSyncNotice) {
                    gameSyncNotice.style.display = 'block';
                }

                // Cross-tab local storage token for instant game detection
                localStorage.setItem('paxis_active_bottle_prediction', targetOutcome);

                // Save history
                const entry = {
                    outcome: targetOutcome,
                    tier: voucherState.cost > 0 ? `$${voucherState.cost} Voucher` : 'N/A',
                    time: new Date().toLocaleTimeString(),
                    date: new Date().toLocaleDateString()
                };
                history.unshift(entry);
                if (history.length > 20) history.pop();
                localStorage.setItem('predictorHistory', JSON.stringify(history));
                renderHistory();

                predictBtn.disabled = false;
                updateTrialsDisplay();
            }
        }, 80);
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
                outcomeEl.textContent = data.prediction;
                outcomeEl.className = 'status-value ' + data.prediction.toLowerCase();
                statusMsg.textContent = 'Active node sync established.';
                statusMsg.style.color = '#00ff66';
                if (gameSyncNotice) gameSyncNotice.style.display = 'block';
                localStorage.setItem('paxis_active_bottle_prediction', data.prediction);
            }
        } catch (e) {
            // silent fail
        }
    }

    function renderHistory() {
        if (!history.length) {
            historyList.innerHTML = '<div class="history-item-empty">No predictions yet</div>';
            return;
        }
        historyList.innerHTML = history.map(h => `
            <div class="history-item">
                <span class="hist-outcome ${h.outcome.toLowerCase()}">${h.outcome} <small style="color:var(--muted);font-weight:400">(${h.tier})</small></span>
                <span class="hist-time">${h.time}</span>
            </div>
        `).join('');
    }
})();


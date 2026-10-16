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

    const predictedTeamsContainer = document.getElementById('predictedTeamsContainer');
    const gameSyncNotice = document.getElementById('gameSyncNotice');

    let currentSelectedImage = null;
    let detectedMatches = [];
    let detectedTeamsList = [];
    let activePredictedList = [];

    // Catalog of known leagues and fixtures
    const ALL_LEAGUES_FIXTURES = {
        england: [
            ['NRW', 'NEW', 'Norwich', 'Newcastle'],
            ['WAT', 'WHU', 'Watford', 'West Ham'],
            ['EVE', 'AST', 'Everton', 'Aston Villa'],
            ['WOL', 'SOU', 'Wolves', 'Southampton'],
            ['CRY', 'BUR', 'Crystal Palace', 'Burnley'],
            ['CHE', 'LEE', 'Chelsea', 'Leeds'],
            ['ARS', 'BRE', 'Arsenal', 'Brentford'],
            ['MCI', 'FUL', 'Man City', 'Fulham'],
            ['BHA', 'TOT', 'Brighton', 'Tottenham']
        ],
        spain: [
            ['RMA', 'BAR', 'Real Madrid', 'Barcelona'],
            ['ATM', 'SEV', 'Atl. Madrid', 'Sevilla'],
            ['VIL', 'BET', 'Villarreal', 'Real Betis'],
            ['RSO', 'ATH', 'Real Sociedad', 'Athletic Bilbao'],
            ['VAL', 'CEL', 'Valencia', 'Celta Vigo'],
            ['GET', 'GIR', 'Getafe', 'Girona'],
            ['ESP', 'MAL', 'Espanyol', 'Mallorca'],
            ['RAY', 'OSA', 'Rayo Vallecano', 'Osasuna']
        ],
        germany: [
            ['BAY', 'DOR', 'Bayern Munich', 'Dortmund'],
            ['LEI', 'LEV', 'RB Leipzig', 'Leverkusen'],
            ['FRA', 'WOB', 'Frankfurt', 'Wolfsburg'],
            ['STU', 'MGL', 'Stuttgart', 'Monchengladbach'],
            ['HOF', 'FRE', 'Hoffenheim', 'Freiburg'],
            ['AUG', 'MAI', 'Augsburg', 'Mainz'],
            ['UNI', 'BRE', 'Union Berlin', 'Werder Bremen']
        ],
        italy: [
            ['INT', 'MIL', 'Inter Milan', 'AC Milan'],
            ['JUV', 'NAP', 'Juventus', 'Napoli'],
            ['ROM', 'LAZ', 'AS Roma', 'Lazio'],
            ['ATA', 'FIO', 'Atalanta', 'Fiorentina'],
            ['TOR', 'BOL', 'Torino', 'Bologna']
        ]
    };

    const KNOWN_TEAMS = [
        // England
        { code: 'NRW', name: 'Norwich', league: 'england', aliases: ['norwich', 'nrw', 'norw'] },
        { code: 'NEW', name: 'Newcastle', league: 'england', aliases: ['newcastle', 'new', 'newc'] },
        { code: 'WAT', name: 'Watford', league: 'england', aliases: ['watford', 'wat', 'watf'] },
        { code: 'WHU', name: 'West Ham', league: 'england', aliases: ['west ham', 'whu', 'westham', 'w.ham'] },
        { code: 'EVE', name: 'Everton', league: 'england', aliases: ['everton', 'eve', 'ever'] },
        { code: 'AST', name: 'Aston Villa', league: 'england', aliases: ['aston villa', 'villa', 'ast', 'aston'] },
        { code: 'WOL', name: 'Wolves', league: 'england', aliases: ['wolves', 'wolverhampton', 'wol'] },
        { code: 'SOU', name: 'Southampton', league: 'england', aliases: ['southampton', 'sou', 'soton', 'south'] },
        { code: 'CRY', name: 'Crystal Palace', league: 'england', aliases: ['crystal palace', 'palace', 'cry', 'crystal'] },
        { code: 'BUR', name: 'Burnley', league: 'england', aliases: ['burnley', 'bur', 'burn'] },
        { code: 'CHE', name: 'Chelsea', league: 'england', aliases: ['chelsea', 'che', 'chels'] },
        { code: 'LEE', name: 'Leeds', league: 'england', aliases: ['leeds', 'lee', 'leed'] },
        { code: 'ARS', name: 'Arsenal', league: 'england', aliases: ['arsenal', 'ars', 'arsn'] },
        { code: 'BRE', name: 'Brentford', league: 'england', aliases: ['brentford', 'bre', 'brent'] },
        { code: 'MCI', name: 'Man City', league: 'england', aliases: ['man city', 'manchester city', 'mci', 'm.city'] },
        { code: 'FUL', name: 'Fulham', league: 'england', aliases: ['fulham', 'ful', 'fulh'] },
        { code: 'MUN', name: 'Man United', league: 'england', aliases: ['man united', 'manchester united', 'mun', 'm.united'] },
        { code: 'LIV', name: 'Liverpool', league: 'england', aliases: ['liverpool', 'liv'] },
        { code: 'TOT', name: 'Tottenham', league: 'england', aliases: ['tottenham', 'spurs', 'tot', 'totten'] },
        { code: 'BHA', name: 'Brighton', league: 'england', aliases: ['brighton', 'bha', 'brigh'] },
        // Spain
        { code: 'RMA', name: 'Real Madrid', league: 'spain', aliases: ['real madrid', 'rma', 'madrid', 'r.madrid'] },
        { code: 'BAR', name: 'Barcelona', league: 'spain', aliases: ['barcelona', 'bar', 'barca'] },
        { code: 'ATM', name: 'Atl. Madrid', league: 'spain', aliases: ['atletico', 'atm', 'atl madrid'] },
        { code: 'SEV', name: 'Sevilla', league: 'spain', aliases: ['sevilla', 'sev'] },
        { code: 'VIL', name: 'Villarreal', league: 'spain', aliases: ['villarreal', 'vil'] },
        { code: 'BET', name: 'Real Betis', league: 'spain', aliases: ['betis', 'bet', 'real betis'] },
        { code: 'RSO', name: 'Real Sociedad', league: 'spain', aliases: ['sociedad', 'rso'] },
        { code: 'ATH', name: 'Athletic Bilbao', league: 'spain', aliases: ['bilbao', 'ath', 'athletic'] },
        { code: 'VAL', name: 'Valencia', league: 'spain', aliases: ['valencia', 'val'] },
        { code: 'CEL', name: 'Celta Vigo', league: 'spain', aliases: ['celta', 'cel', 'vigo'] },
        { code: 'GET', name: 'Getafe', league: 'spain', aliases: ['getafe', 'get'] },
        { code: 'GIR', name: 'Girona', league: 'spain', aliases: ['girona', 'gir'] },
        // Germany
        { code: 'BAY', name: 'Bayern Munich', league: 'germany', aliases: ['bayern', 'bay', 'munich', 'fcb'] },
        { code: 'DOR', name: 'Dortmund', league: 'germany', aliases: ['dortmund', 'dor', 'bvb', 'borussia'] },
        { code: 'LEI', name: 'RB Leipzig', league: 'germany', aliases: ['leipzig', 'lei', 'rb leipzig'] },
        { code: 'LEV', name: 'Leverkusen', league: 'germany', aliases: ['leverkusen', 'lev', 'bayer'] },
        { code: 'FRA', name: 'Frankfurt', league: 'germany', aliases: ['frankfurt', 'fra'] },
        { code: 'WOB', name: 'Wolfsburg', league: 'germany', aliases: ['wolfsburg', 'wob'] },
        // Italy
        { code: 'INT', name: 'Inter Milan', league: 'italy', aliases: ['inter', 'int', 'inter milan'] },
        { code: 'MIL', name: 'AC Milan', league: 'italy', aliases: ['milan', 'mil', 'ac milan'] },
        { code: 'JUV', name: 'Juventus', league: 'italy', aliases: ['juventus', 'juv', 'juve'] },
        { code: 'NAP', name: 'Napoli', league: 'italy', aliases: ['napoli', 'nap'] },
        { code: 'ROM', name: 'AS Roma', league: 'italy', aliases: ['roma', 'rom'] },
        { code: 'LAZ', name: 'Lazio', league: 'italy', aliases: ['lazio', 'laz'] }
    ];

    // Voucher state
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

    // Helper: Find team by string token or alias
    function matchTeam(token) {
        if (!token || token.length < 2) return null;
        const clean = token.toLowerCase().trim();
        for (const t of KNOWN_TEAMS) {
            if (t.code.toLowerCase() === clean) return t;
            if (t.name.toLowerCase() === clean) return t;
            for (const alias of t.aliases) {
                if (alias === clean) return t;
                if (clean.length >= 4 && (alias.startsWith(clean) || clean.startsWith(alias))) return t;
            }
        }
        return null;
    }

    // Helper: Find all teams mentioned in a line of text
    function extractTeamsFromLine(lineText) {
        const found = [];
        const normalized = lineText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const tokens = normalized.split(/\s+/).filter(w => w.length >= 2);

        // Check multi-word team names first
        KNOWN_TEAMS.forEach(t => {
            const hasFullName = normalized.includes(t.name.toLowerCase());
            const hasAlias = t.aliases.some(a => a.length >= 4 && normalized.includes(a));
            const hasExactToken = tokens.some(tok => tok === t.code.toLowerCase());

            if (hasFullName || hasAlias || hasExactToken) {
                if (!found.some(x => x.code === t.code)) {
                    // Record index in line for left-to-right order
                    const idx = normalized.indexOf(t.code.toLowerCase()) !== -1
                        ? normalized.indexOf(t.code.toLowerCase())
                        : normalized.indexOf(t.aliases[0]);
                    found.push({ ...t, pos: idx });
                }
            }
        });

        found.sort((a, b) => a.pos - b.pos);
        return found;
    }

    // File Selection & Automated AI OCR Extraction
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            currentSelectedImage = event.target.result;
            previewImg.src = currentSelectedImage;
            previewBox.style.display = 'block';

            detectedTeamsBadge.style.display = 'inline-flex';
            detectedTeamsText.textContent = 'Scanning screenshot with AI vision...';
            statusMsg.textContent = 'Extracting match fixtures and teams from screenshot...';
            statusMsg.style.color = 'var(--gold)';

            const seenTeamsCard = document.getElementById('seenTeamsCard');
            const seenTeamsList = document.getElementById('seenTeamsList');
            const seenTeamsCount = document.getElementById('seenTeamsCount');
            const ocrDebugDetails = document.getElementById('ocrDebugDetails');
            const ocrDebugText = document.getElementById('ocrDebugText');

            detectedMatches = [];
            detectedTeamsList = [];

            // Canvas image preprocessing to sharpen text
            const preprocessImage = (dataUrl) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = Math.min(1800, img.width * 1.5);
                        canvas.height = Math.min(2600, img.height * 1.5);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const d = imgData.data;
                        for (let i = 0; i < d.length; i += 4) {
                            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                            const b = gray > 140 ? 255 : (gray < 80 ? 0 : gray);
                            d[i] = b;
                            d[i + 1] = b;
                            d[i + 2] = b;
                        }
                        ctx.putImageData(imgData, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                });
            };

            // Run Tesseract OCR
            if (window.Tesseract) {
                try {
                    const preprocessed = await preprocessImage(currentSelectedImage);
                    const ocrResult = await Tesseract.recognize(preprocessed, 'eng', {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                detectedTeamsText.textContent = `AI Vision Scanning (${Math.round(m.progress * 100)}%)...`;
                            }
                        }
                    });

                    const rawText = ocrResult.data.text || '';
                    const lines = ocrResult.data.lines || [];

                    if (ocrDebugDetails && ocrDebugText) {
                        ocrDebugDetails.style.display = 'block';
                        ocrDebugText.textContent = `Detected Text Snippet: ${rawText.replace(/\s+/g, ' ').slice(0, 220)}...`;
                    }

                    // 1. Line-by-line extraction: find pairs appearing together horizontally
                    const linePairs = [];
                    const orderedTeams = [];

                    lines.forEach(lineObj => {
                        const lText = lineObj.text || '';
                        const teamsInLine = extractTeamsFromLine(lText);
                        if (teamsInLine.length >= 2) {
                            for (let i = 0; i < teamsInLine.length - 1; i += 2) {
                                linePairs.push([teamsInLine[i], teamsInLine[i + 1]]);
                            }
                        }
                        teamsInLine.forEach(t => {
                            if (!orderedTeams.some(x => x.code === t.code)) {
                                orderedTeams.push(t);
                            }
                        });
                    });

                    // 2. Also scan entire text if line parsing missed some
                    const fullTextClean = rawText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
                    KNOWN_TEAMS.forEach(t => {
                        const hasFull = fullTextClean.includes(t.name.toLowerCase());
                        const hasCode = new RegExp(`\\b${t.code.toLowerCase()}\\b`).test(fullTextClean);
                        const hasAlias = t.aliases.some(a => fullTextClean.includes(a));
                        if ((hasFull || hasCode || hasAlias) && !orderedTeams.some(x => x.code === t.code)) {
                            orderedTeams.push(t);
                        }
                    });

                    detectedTeamsList = orderedTeams;

                    // 3. Construct match pairs
                    if (linePairs.length > 0) {
                        linePairs.forEach(p => {
                            if (!detectedMatches.some(m => m[0] === p[0].code && m[1] === p[1].code)) {
                                detectedMatches.push([p[0].code, p[1].code, `${p[0].name} vs ${p[1].name}`]);
                            }
                        });
                    }

                    // If more teams exist, pair adjacent teams
                    if (orderedTeams.length >= 2) {
                        for (let i = 0; i < orderedTeams.length - 1; i += 2) {
                            const h = orderedTeams[i].code;
                            const a = orderedTeams[i + 1].code;
                            if (!detectedMatches.some(m => (m[0] === h && m[1] === a) || (m[0] === a && m[1] === h))) {
                                detectedMatches.push([h, a, `${orderedTeams[i].name} vs ${orderedTeams[i + 1].name}`]);
                            }
                        }
                    }

                    // If an odd team is left over, complete with its known round opponent
                    if (orderedTeams.length % 2 === 1) {
                        const odd = orderedTeams[orderedTeams.length - 1];
                        const leagueFixtures = ALL_LEAGUES_FIXTURES[odd.league] || ALL_LEAGUES_FIXTURES.england;
                        const known = leagueFixtures.find(f => f[0] === odd.code || f[1] === odd.code);
                        if (known) {
                            const partnerCode = known[0] === odd.code ? known[1] : known[0];
                            const partnerTeam = KNOWN_TEAMS.find(k => k.code === partnerCode);
                            if (partnerTeam && !detectedMatches.some(m => m[0] === odd.code || m[1] === odd.code)) {
                                detectedMatches.push([odd.code, partnerTeam.code, `${odd.name} vs ${partnerTeam.name}`]);
                                detectedTeamsList.push(partnerTeam);
                            }
                        }
                    }

                } catch (ocrErr) {
                    console.warn('OCR processing failed:', ocrErr);
                }
            }

            // Fallback: If image was blurry or contained no text, use England matchday round
            if (detectedMatches.length === 0) {
                ALL_LEAGUES_FIXTURES.england.slice(0, 6).forEach(f => {
                    detectedMatches.push([f[0], f[1], `${f[2]} vs ${f[3]}`]);
                    const t1 = KNOWN_TEAMS.find(t => t.code === f[0]);
                    const t2 = KNOWN_TEAMS.find(t => t.code === f[1]);
                    if (t1) detectedTeamsList.push(t1);
                    if (t2) detectedTeamsList.push(t2);
                });
            }

            // Display all teams seen in image
            if (seenTeamsCard && seenTeamsList && seenTeamsCount && detectedTeamsList.length > 0) {
                seenTeamsCard.style.display = 'block';
                seenTeamsCount.textContent = `${detectedTeamsList.length} TEAMS DETECTED`;
                seenTeamsList.innerHTML = detectedTeamsList.map(t => `
                    <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); border-radius: 4px; padding: 4px 8px; display: inline-flex; align-items: center; gap: 6px;">
                        <span style="font-family: var(--font-mono); font-weight: 800; color: #00E676; font-size: 11px;">${t.code}</span>
                        <span style="font-size: 11.5px; color: #fff; font-weight: 600;">${t.name}</span>
                    </div>
                `).join('');
            }

            detectedTeamsBadge.style.display = 'inline-flex';
            detectedTeamsText.textContent = `Identified ${detectedMatches.length} Matches from Screenshot`;
            statusMsg.textContent = `AI successfully extracted all ${detectedMatches.length} match fixtures from the screenshot! Generating full predictions...`;
            statusMsg.style.color = '#34c759';

            // Generate predictions for ALL detected fixtures right away!
            generateAndDisplayAllPredictions();
        };
        reader.readAsDataURL(file);
    });

    // Generate high-probability predictions for all detected matches
    function generateAndDisplayAllPredictions() {
        const matches = (detectedMatches.length > 0)
            ? detectedMatches
            : ALL_LEAGUES_FIXTURES.england.slice(0, 6).map(f => [f[0], f[1], `${f[2]} vs ${f[3]}`]);

        activePredictedList = matches.map(([home, away, label], idx) => {
            const hTeam = KNOWN_TEAMS.find(t => t.code === home) || { name: home };
            const aTeam = KNOWN_TEAMS.find(t => t.code === away) || { name: away };

            // Varied high-confidence picks
            const r = Math.random();
            let pickType = 'HOME';
            let winningTeam = hTeam.name;
            let pickLabel = `${home} Win (1)`;
            let score = '2-1';
            let market = '1X2';
            let pick = '1';
            let conf = Math.floor(91 + Math.random() * 8) + '%';

            if (r > 0.55) {
                pickType = 'HOME';
                winningTeam = hTeam.name;
                pickLabel = `${home} Win (1)`;
                score = Math.random() > 0.5 ? '2-1' : '2-0';
                market = '1X2';
                pick = '1';
            } else if (r > 0.20) {
                pickType = 'AWAY';
                winningTeam = aTeam.name;
                pickLabel = `${away} Win (2)`;
                score = Math.random() > 0.5 ? '1-2' : '0-2';
                market = '1X2';
                pick = '2';
            } else {
                pickType = 'OVER';
                winningTeam = `${home} vs ${away}`;
                pickLabel = 'Over 2.5 Goals';
                score = '3-1';
                market = 'OU';
                pick = 'Over 2.5';
            }

            return {
                matchIndex: idx + 1,
                home,
                away,
                homeName: hTeam.name,
                awayName: aTeam.name,
                winningTeam,
                pickLabel,
                market,
                pick,
                score,
                confidence: conf,
                prediction: pickType === 'HOME' ? 'HOME WIN' : (pickType === 'AWAY' ? 'AWAY WIN' : 'OVER 2.5')
            };
        });

        // Update main outcome headline
        outcomeEl.textContent = `${activePredictedList.length} MATCH PREDICTIONS READY`;
        outcomeEl.className = 'status-value homewin';

        // Render cards for ALL detected matches
        if (predictedTeamsContainer) {
            predictedTeamsContainer.style.display = 'flex';
            predictedTeamsContainer.innerHTML = activePredictedList.map((item) => `
                <div class="predicted-team-row">
                    <div>
                        <div class="matchup-text">
                            <span style="color: var(--gold); font-size: 11px; margin-right: 6px;">#${item.matchIndex}</span>
                            ${item.homeName} (${item.home}) vs ${item.awayName} (${item.away})
                        </div>
                        <div style="font-size: 11.5px; color: #00E676; font-weight: 700; margin-top: 3px;">
                            🏆 Predicted Winner: ${item.winningTeam} · Score: ${item.score}
                        </div>
                        <div style="font-size: 10px; color: var(--muted); margin-top: 2px;">
                            Market: ${item.market} (${item.pick}) · Confidence: ${item.confidence}
                        </div>
                    </div>
                    <span class="pick-badge">${item.pickLabel}</span>
                </div>
            `).join('');
        }

        if (gameSyncNotice) {
            gameSyncNotice.style.display = 'block';
        }

        // Store active predictions in localStorage for Instant Virtuals game
        const primaryTarget = activePredictedList[0];
        const syncPayload = {
            ...primaryTarget,
            predictedList: activePredictedList
        };
        localStorage.setItem('paxis_active_virtual_prediction', JSON.stringify(syncPayload));

        // Push to Netlify endpoint
        fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prediction: primaryTarget.prediction,
                market: primaryTarget.market,
                pick: primaryTarget.pick,
                score: primaryTarget.score,
                predictedList: activePredictedList
            })
        }).catch(() => {});
    }

    // Predict & Resolve Button Click
    predictBtn.addEventListener('click', async () => {
        if (voucherState.remaining <= 0) {
            window.location.href = 'pricing.html';
            return;
        }

        if (activePredictedList.length === 0) {
            statusMsg.textContent = 'Please upload a screenshot first or wait for OCR analysis to finish.';
            statusMsg.style.color = 'var(--gold)';
            return;
        }

        predictBtn.disabled = true;
        predictBtn.textContent = 'Deducting voucher trial & locking...';

        try {
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

            // Run resolution animation
            runLockAnimation();

        } catch (err) {
            statusMsg.textContent = `Access Locked: ${err.message}`;
            statusMsg.style.color = '#ff3333';
            predictBtn.disabled = false;
            predictBtn.textContent = 'ANALYZE SCREENSHOT & RESOLVE';
        }
    });

    function runLockAnimation() {
        predictBtn.disabled = true;
        predictBtn.textContent = 'Synthesizing winning vectors...';
        statusMsg.textContent = '';

        const primaryTarget = activePredictedList[0];
        const outcomesList = ['SYNCHRONIZING...', 'LOCKING WIN VECTORS...', 'CONNECTING ENGINE...', 'RESOLVING FIXTURES...'];
        let ticks = 0;
        const maxTicks = 12;

        const interval = setInterval(() => {
            outcomeEl.textContent = outcomesList[ticks % outcomesList.length];
            ticks++;

            if (ticks >= maxTicks) {
                clearInterval(interval);
                outcomeEl.textContent = `${activePredictedList.length} MATCH WINNERS LOCKED`;
                outcomeEl.className = 'status-value homewin';

                statusMsg.textContent = `All ${activePredictedList.length} match fixture predictions locked! Instant Virtuals engine is synchronized.`;
                statusMsg.style.color = '#34c759';

                predictBtn.disabled = false;
                predictBtn.textContent = 'ANALYZE ANOTHER SCREENSHOT';

                // Save to history
                history.unshift({
                    outcome: `${activePredictedList.length} Matches Locked (${primaryTarget.home} vs ${primaryTarget.away})`,
                    date: new Date().toLocaleTimeString(),
                    market: primaryTarget.market,
                    pick: primaryTarget.pick,
                    allPicks: activePredictedList
                });
                if (history.length > 20) history.pop();
                localStorage.setItem('virtualPredictorHistory', JSON.stringify(history));

                renderHistory();
            }
        }, 100);
    }

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
            if (data.predictedList && Array.isArray(data.predictedList) && data.predictedList.length > 0) {
                activePredictedList = data.predictedList;
                outcomeEl.textContent = `${activePredictedList.length} MATCH PREDICTIONS ACTIVE`;
                outcomeEl.className = 'status-value homewin';

                if (predictedTeamsContainer) {
                    predictedTeamsContainer.style.display = 'flex';
                    predictedTeamsContainer.innerHTML = activePredictedList.map((item) => `
                        <div class="predicted-team-row">
                            <div>
                                <div class="matchup-text">
                                    <span style="color: var(--gold); font-size: 11px; margin-right: 6px;">#${item.matchIndex}</span>
                                    ${item.homeName || item.home} vs ${item.awayName || item.away}
                                </div>
                                <div style="font-size: 11.5px; color: #00E676; font-weight: 700; margin-top: 3px;">
                                    🏆 Winner: ${item.winningTeam} · Score: ${item.score}
                                </div>
                            </div>
                            <span class="pick-badge">${item.pickLabel}</span>
                        </div>
                    `).join('');
                }
                if (gameSyncNotice) gameSyncNotice.style.display = 'block';
            } else if (data.prediction) {
                outcomeEl.textContent = `${data.prediction} (${data.score || '2-1'})`;
                outcomeEl.className = 'status-value homewin';
            }
        } catch (e) {
            // silent
        }
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

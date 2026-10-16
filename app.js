document.addEventListener('DOMContentLoaded', () => {
    // Game State - Balance initialized comfortably for up to 50k stakes
    let savedBalance = localStorage.getItem('spindabottle_balance');
    if (!savedBalance || parseFloat(savedBalance) < 50000) {
        const randomBase = Math.floor(Math.random() * (100000 - 50000 + 1)) + 50000;
        const randomCents = parseFloat((Math.random() * 0.99).toFixed(2));
        savedBalance = (randomBase + randomCents).toFixed(2);
        localStorage.setItem('spindabottle_balance', savedBalance);
    }
    let walletBalance = parseFloat(savedBalance);
    let currentBet = 0.50;
    let isSpinning = false;
    let totalRotation = 0;

    // DOM Elements
    const walletBalanceEl = document.getElementById('walletBalance');
    const addMoneyBtn = document.getElementById('addMoneyBtn');
    const addMoneyModal = document.getElementById('addMoneyModal');
    const closeAddMoneyBtn = document.getElementById('closeAddMoneyBtn');
    const fundOptButtons = document.querySelectorAll('.fund-opt-btn');

    const betDisplayBox = document.querySelector('.bet-display-box');
    const betDisplayAmount = document.getElementById('betDisplayAmount');
    const betSlider = document.getElementById('betSlider');
    const sliderTrackFill = document.getElementById('sliderTrackFill');
    const chipButtons = document.querySelectorAll('.chip-btn[data-value]');
    const errorText = document.getElementById('errorText');

    const betUpBtn = document.getElementById('betUpBtn');
    const betDownBtn = document.getElementById('betDownBtn');
    const bottleContainer = document.getElementById('bottleContainer');

    const outcomeOverlay = document.getElementById('outcomeOverlay');
    const outcomeCard = document.getElementById('outcomeCard');
    const outcomeTitle = document.getElementById('outcomeTitle');
    const outcomeDetail = document.getElementById('outcomeDetail');
    const backBtn = document.getElementById('backBtn');

    // Initialize UI
    updateUI();

    // Back to Lobby Navigation
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    // Event Listeners for Betting Controls
    betSlider.addEventListener('input', (e) => {
        setBetAmount(parseFloat(e.target.value));
    });

    if (betDisplayBox) {
        betDisplayBox.style.cursor = 'pointer';
        betDisplayBox.title = 'Click to enter custom stake (up to 50,000)';
        betDisplayBox.addEventListener('click', () => {
            if (isSpinning) return;
            const inputVal = prompt('Enter your stake amount (0.50 - 50,000.00 GHS):', currentBet.toString());
            if (inputVal !== null) {
                const parsed = parseFloat(inputVal.replace(/,/g, ''));
                if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 50000) {
                    setBetAmount(parsed);
                } else if (parsed > 50000) {
                    alert('Maximum allowed stake is 50,000 GHS.');
                    setBetAmount(50000);
                } else if (parsed < 0.5) {
                    alert('Minimum allowed stake is 0.50 GHS.');
                    setBetAmount(0.5);
                }
            }
        });
    }

    chipButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selection active styling
            chipButtons.forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
            
            const value = parseFloat(button.getAttribute('data-value'));
            setBetAmount(value);
        });
    });

    // Add Money Logic
    addMoneyBtn.addEventListener('click', () => {
        addMoneyModal.classList.add('show');
    });

    closeAddMoneyBtn.addEventListener('click', () => {
        addMoneyModal.classList.remove('show');
    });

    // ── Deposit via Martha Solutions Payment Gateway ─────────────────
    let selectedDepositAmount = null;

    fundOptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            fundOptButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedDepositAmount = parseFloat(btn.getAttribute('data-amount'));
            const customInput = document.getElementById('depositCustomAmount');
            if (customInput) customInput.value = '';
        });
    });

    const proceedDepositBtn = document.getElementById('proceedDepositBtn');
    if (proceedDepositBtn) {
        proceedDepositBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('depositEmail');
            const customAmountInput = document.getElementById('depositCustomAmount');
            const depositError = document.getElementById('depositError');

            const email = emailInput ? emailInput.value.trim() : '';
            const customAmt = customAmountInput ? parseFloat(customAmountInput.value) : NaN;
            const amount = (!isNaN(customAmt) && customAmt > 0) ? customAmt : selectedDepositAmount;

            // Validate
            if (!email || !email.includes('@')) {
                depositError.textContent = 'Please enter a valid email address.';
                depositError.style.display = 'block';
                return;
            }
            if (!amount || amount <= 0) {
                depositError.textContent = 'Please select or enter a deposit amount.';
                depositError.style.display = 'block';
                return;
            }
            depositError.style.display = 'none';

            proceedDepositBtn.disabled = true;
            proceedDepositBtn.textContent = 'Creating session…';

            try {
                // Save pending deposit context to localStorage so payment-return.html can credit the wallet
                localStorage.setItem('pending_deposit_amount', amount.toFixed(2));
                localStorage.setItem('pending_deposit_email', email);

                const siteOrigin = window.location.origin;
                const returnUrl = siteOrigin + '/payment-return.html';
                const cancelUrl = siteOrigin + '/game.html';

                const res = await fetch('/.netlify/functions/gateway-init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: amount,
                        email: email,
                        merchant_name: 'Sporty Games',
                        title: 'Wallet Top-Up — GHS ' + amount.toFixed(2),
                        callback_url: returnUrl,
                        cancel_url: cancelUrl,
                        metadata: { source: 'game_deposit' }
                    })
                });

                const data = await res.json();
                if (data.success && data.checkout_url) {
                    window.location.href = data.checkout_url;
                } else {
                    throw new Error(data.error || 'Could not create payment session.');
                }
            } catch (err) {
                depositError.textContent = err.message || 'Payment initiation failed. Please try again.';
                depositError.style.display = 'block';
                proceedDepositBtn.disabled = false;
                proceedDepositBtn.textContent = 'Proceed to Pay';
            }
        });
    }

    // Game Action Listeners
    betUpBtn.addEventListener('click', () => startSpin('UP'));
    betDownBtn.addEventListener('click', () => startSpin('DOWN'));
    
    // Core Functions
    function setBetAmount(amount) {
        if (isSpinning) return;
        currentBet = amount;
        betSlider.value = amount;
        betDisplayAmount.textContent = amount.toFixed(2);
        
        // Sync Slider track background highlight
        const min = parseFloat(betSlider.min);
        const max = parseFloat(betSlider.max);
        const pct = ((amount - min) / (max - min)) * 100;
        sliderTrackFill.style.width = `${pct}%`;

        // Highlight matching chip button if any
        chipButtons.forEach(btn => {
            const val = parseFloat(btn.getAttribute('data-value'));
            if (val === amount) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        validateBet();
    }

    function validateBet() {
        if (isSpinning) return;

        if (currentBet > walletBalance) {
            errorText.classList.add('visible');
            betUpBtn.disabled = true;
            betDownBtn.disabled = true;
        } else {
            errorText.classList.remove('visible');
            betUpBtn.disabled = false;
            betDownBtn.disabled = false;
        }
    }

    
    function updateBalanceDisplay() {
        if (walletBalanceEl) {
            walletBalanceEl.textContent = walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        localStorage.setItem('spindabottle_balance', walletBalance.toFixed(2));
    }

    function updateUI() {
        updateBalanceDisplay();
        setBetAmount(currentBet);
    }

    async function startSpin(selectedBetSide) {
        if (isSpinning || currentBet > walletBalance) return;

        isSpinning = true;
        betUpBtn.disabled = true;
        betDownBtn.disabled = true;
        errorText.classList.remove('visible');

        // Deduct bet amount immediately
        walletBalance -= currentBet;
        updateBalanceDisplay();

        let outcome = 'UP';
        
        // Fetch active prediction from Precision Axis backend if available
        try {
            const res = await fetch('https://precisionaxis.online/.netlify/functions/prediction');
            const data = await res.json();
            
            if (data.prediction && ['UP', 'DOWN', 'MIDDLE'].includes(data.prediction)) {
                outcome = data.prediction;
                
                // Clear the prediction so it's only used once
                fetch('https://precisionaxis.online/.netlify/functions/prediction', { method: 'DELETE' }).catch(() => {});
            } else {
                // Fallback to random weighted odds
                const rand = Math.random() * 100;
                if (rand < 48) {
                    outcome = 'UP';
                } else if (rand < 96) {
                    outcome = 'DOWN';
                } else {
                    outcome = 'MIDDLE';
                }
            }
        } catch (e) {
            // Network fallback
            const rand = Math.random() * 100;
            if (rand < 48) {
                outcome = 'UP';
            } else if (rand < 96) {
                outcome = 'DOWN';
            } else {
                outcome = 'MIDDLE';
            }
        }

        // Determine angle matching the outcome
        let targetAngle = 0;
        if (outcome === 'UP') {
            targetAngle = 210 + Math.random() * 120;
        } else if (outcome === 'DOWN') {
            targetAngle = 30 + Math.random() * 120;
        } else {
            targetAngle = Math.random() > 0.5 ? 0 : 180;
        }

        // Add 5-7 full spins (1800 - 2520 degrees) to create spinning illusion
        const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360;
        totalRotation += extraSpins + (targetAngle - (totalRotation % 360));

        // Apply transition styling and rotate
        bottleContainer.style.transition = 'transform 3.5s cubic-bezier(0.1, 0.8, 0.15, 1)';
        bottleContainer.style.transform = `rotate(${totalRotation}deg)`;

        // Handle animation finish
        setTimeout(() => {
            showOutcome(selectedBetSide, outcome);
        }, 3650);
    }

    let activeConfetti = [];
    let lastBetSide = null;

                            let confettiCanvas = null;
    let confettiCtx = null;
    let activeParticles = [];
    let confettiAnimId = null;

    function createBrownianConfetti() {
        if (!confettiCanvas) {
            confettiCanvas = document.createElement('canvas');
            confettiCanvas.id = 'brownianConfettiCanvas';
            confettiCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:999999;';
            document.body.appendChild(confettiCanvas);
            confettiCtx = confettiCanvas.getContext('2d');
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        confettiCanvas.width = width;
        confettiCanvas.height = height;

        const colors = ['#ff3b70', '#ffee44', '#00e676', '#00e5ff', '#ffffff', '#aa00ff', '#ff9100'];
        activeParticles = [];

        // Spawn 160 independent paper ribbon particles with irregular 3D flutter
        for (let i = 0; i < 160; i++) {
            const isLeft = i < 80;
            const startX = isLeft ? Math.random() * (width * 0.28) : width - Math.random() * (width * 0.28);
            const startY = height + Math.random() * 25;

            const launchAngle = isLeft 
                ? (Math.random() * 42 + 42) * (Math.PI / 180) 
                : (Math.random() * 42 + 96) * (Math.PI / 180);

            const speed = Math.random() * 17 + 13; 
            const vx = Math.cos(launchAngle) * speed;
            const vy = -Math.sin(launchAngle) * speed;

            activeParticles.push({
                x: startX,
                y: startY,
                vx: vx,
                vy: vy,
                gravity: Math.random() * 0.12 + 0.15,        // Slow paper descent
                drag: Math.random() * 0.016 + 0.966,          // Air resistance drag
                wobble: Math.random() * Math.PI * 2,
                wobbleSpeed: Math.random() * 0.12 + 0.04,      // Main flutter frequency
                wobbleAmp: Math.random() * 2.8 + 0.6,         // Primary sideways drift
                jitter: Math.random() * Math.PI * 2,
                jitterSpeed: Math.random() * 0.22 + 0.07,     // Irregular wind gust jitter
                flipAngle: Math.random() * Math.PI * 2,
                flipSpeed: Math.random() * 0.16 + 0.05,       // 3D paper flipping speed
                width: Math.random() * 4 + 6,                // 6px - 10px width
                height: Math.random() * 7 + 11,              // 11px - 18px height (rectangular ribbon)
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.22,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: 1
            });
        }

        if (confettiAnimId) {
            cancelAnimationFrame(confettiAnimId);
        }

        function renderFrame() {
            if (!confettiCtx) return;
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

            let aliveCount = 0;
            for (let i = 0; i < activeParticles.length; i++) {
                const p = activeParticles[i];
                if (p.opacity <= 0) continue;
                aliveCount++;

                // Physics update (multi-harmonic irregular wind gusting)
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.wobble += p.wobbleSpeed;
                p.jitter += p.jitterSpeed;
                p.flipAngle += p.flipSpeed;

                const airJitter = Math.sin(p.wobble) * p.wobbleAmp + Math.cos(p.jitter * 2.3) * (p.wobbleAmp * 0.45);
                p.x += p.vx + airJitter;
                p.y += p.vy;
                p.rotation += p.rotationSpeed + Math.sin(p.wobble * 1.5) * 0.06;

                // Fade out near ground
                if (p.y > height - 60) {
                    p.opacity -= 0.018;
                }

                // Render particle with 3D paper flip oscillation (scaleX flips catch light!)
                const currentScaleX = Math.abs(Math.cos(p.flipAngle));
                confettiCtx.save();
                confettiCtx.translate(p.x, p.y);
                confettiCtx.rotate(p.rotation);
                confettiCtx.scale(currentScaleX, 1);
                confettiCtx.globalAlpha = Math.max(0, p.opacity);
                confettiCtx.fillStyle = p.color;
                confettiCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
                confettiCtx.restore();
            }

            if (aliveCount > 0) {
                confettiAnimId = requestAnimationFrame(renderFrame);
            } else {
                confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            }
        }

        renderFrame();
    }

    function clearBrownianConfetti() {
        if (confettiAnimId) {
            cancelAnimationFrame(confettiAnimId);
            confettiAnimId = null;
        }
        if (confettiCtx && confettiCanvas) {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
        activeParticles = [];
    }

    function triggerConfetti() {
        createBrownianConfetti();

        // Also fire canvas-confetti library if loaded
        try {
            if (typeof window.confetti === 'function') {
                const colors = ['#ff3b70', '#ffee44', '#00e676', '#00e5ff', '#ffffff', '#aa00ff', '#ff9100'];
                window.confetti({ particleCount: 80, angle: 60, spread: 80, startVelocity: 60, gravity: 0.4, origin: { x: 0.05, y: 0.95 }, colors: colors, shapes: ['square'], zIndex: 999999 });
                window.confetti({ particleCount: 80, angle: 120, spread: 80, startVelocity: 60, gravity: 0.4, origin: { x: 0.95, y: 0.95 }, colors: colors, shapes: ['square'], zIndex: 999999 });
            }
        } catch (e) {}
    }

    function clearConfetti() {
        clearBrownianConfetti();
        try {
            if (window.confetti && typeof window.confetti.reset === 'function') {
                window.confetti.reset();
            }
        } catch (e) {}
    }

    function showOutcome(playerBet, finalOutcome) {
        isSpinning = false;
        lastBetSide = playerBet;
        
        let win = false;
        let payout = 0;
        let bannerImage = 'outcome_middle.659e8b15.svg';

        if (finalOutcome === 'MIDDLE') {
            win = false;
            bannerImage = 'outcome_middle.659e8b15.svg';
        } else if (playerBet === finalOutcome) {
            win = true;
            payout = currentBet * 2;
            walletBalance += payout;
            updateBalanceDisplay();
            bannerImage = playerBet === 'UP' ? 'up_win.2e80de84.svg' : 'down_win.22593c86.svg';
        } else {
            win = false;
            bannerImage = playerBet === 'UP' ? 'up_lose.eefc4a55.svg' : 'down_lose.77a3b135.svg';
        }

        // Set SVG background banner image on the outcome card
        outcomeCard.style.backgroundImage = `url('${bannerImage}')`;
        
        // Show landing side in lowercase inside the banner (e.g. "up" or "down")
        outcomeTitle.textContent = finalOutcome === 'MIDDLE' ? 'middle' : finalOutcome.toLowerCase();

        const amountTextSpan = document.getElementById('outcomeAmountVal');
        if (win) {
            outcomeCard.classList.add('win-pulse');
            triggerConfetti();
            document.getElementById('outcomeAmountText').innerHTML = `You Won 🏆 <span id="outcomeAmountVal">GHS ${payout.toFixed(2)}</span>`;
        } else {
            outcomeCard.classList.remove('win-pulse');
            clearConfetti();
            document.getElementById('outcomeAmountText').innerHTML = `Sorry, you chose ${playerBet}!`;
        }

        // Display Outcome Modal
        outcomeOverlay.classList.add('show');
    }

    // Overlay button action wiring
    document.getElementById('overlayNewRoundBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        outcomeOverlay.classList.remove('show');
        clearConfetti();
        
        // Reset bottle to middle state instantly
        bottleContainer.style.transition = 'none';
        bottleContainer.style.transform = 'rotate(0deg)';
        totalRotation = 0;

        validateBet();
    });

    document.getElementById('overlayRebetBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        outcomeOverlay.classList.remove('show');
        clearConfetti();
        
        // Reset bottle to middle state instantly
        bottleContainer.style.transition = 'none';
        bottleContainer.style.transform = 'rotate(0deg)';
        totalRotation = 0;
        
        // Auto trigger spin with same bet side if they have enough balance
        if (walletBalance >= currentBet) {
            // Short timeout to let the reset complete before starting the spin transition
            setTimeout(() => {
                startSpin(lastBetSide);
            }, 50);
        } else {
            validateBet();
            errorText.classList.add('visible');
        }
    });
});


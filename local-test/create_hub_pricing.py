hub_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Precision Axis – Dashboard [LOCAL TEST]</title>
    <link rel="stylesheet" href="/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
    <style>
        .test-banner {
            background: #00a84c; color: #fff; text-align: center;
            font-family: 'Share Tech Mono', monospace; font-size: 12px;
            font-weight: 700; padding: 8px; letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="test-banner">✅ USER LOGGED IN & SESSION ACTIVE [LOCAL TEST]</div>
    <div class="landing-container" style="max-width: 800px; margin: 40px auto; padding: 20px;">
        <header class="landing-header" style="margin-bottom: 30px;">
            <div class="logo-box">
                <span class="logo-txt">PRECISION AXIS</span>
                <span class="logo-sub">AI Analytics Dashboard</span>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <a href="pricing-test.html" style="color: var(--gold); border: 1px solid var(--gold); padding: 6px 12px; border-radius: 4px; text-decoration: none; font-family: var(--font-mono); font-size: 12px;">+ Buy Voucher</a>
                <a href="auth-test.html" onclick="localStorage.clear()" style="color: var(--muted); text-decoration: none; font-family: var(--font-mono); font-size: 12px;">Log Out</a>
            </div>
        </header>
        <main>
            <div class="material-panel" style="padding: 30px; border: 1px solid var(--border); background: var(--bg-panel); border-radius: 8px;">
                <h2 style="font-size: 24px; color: var(--gold); margin-bottom: 8px;">Welcome to Dashboard</h2>
                <p style="color: var(--muted); font-size: 13px; font-family: var(--font-mono);" id="userDisplay">Email: user@example.com</p>
                <div style="margin-top: 24px; padding: 16px; background: rgba(0,255,136,0.08); border: 1px solid rgba(0,255,136,0.3); border-radius: 6px;">
                    <span style="color: var(--green); font-weight: 700;">Account Status: ACTIVE (Paid Signup Confirmed)</span>
                </div>
            </div>
        </main>
    </div>
    <script>
        const email = localStorage.getItem('paxis_test_email') || 'user@test.com';
        document.getElementById('userDisplay').textContent = 'Signed in as: ' + email;
    </script>
</body>
</html>
"""

pricing_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Precision Axis – AI Analytics Vouchers [LOCAL TEST]</title>
    <link rel="stylesheet" href="/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
    <style>
        .test-banner {
            background: #ff6b00; color: #000; text-align: center;
            font-family: 'Share Tech Mono', monospace; font-size: 12px;
            font-weight: 700; padding: 8px; letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="test-banner">⚠ LOCAL TEST MODE — Precision Axis &rarr; Martha Solutions Gateway Flow [Test Key Active]</div>

    <div class="landing-container">
        <div class="border-marker top-left"></div>
        <div class="border-marker top-right"></div>
        <div class="border-marker bottom-left"></div>
        <div class="border-marker bottom-right"></div>

        <header class="landing-header">
            <div class="logo-box">
                <span class="logo-txt">Precision Axis</span>
                <span class="logo-sub">AI Analytics Vouchers [TEST]</span>
            </div>
            <a href="auth-test.html" style="color: var(--gold); text-decoration: none; font-family: var(--font-mono); font-size: 12px; font-weight: 700; border: 1px solid var(--gold); padding: 5px 10px; border-radius: 4px;">&larr; Auth / Signup Test</a>
        </header>

        <main class="landing-main" style="padding: 40px 0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24px; font-weight: 800; color: var(--text-primary);">AI Analytics Vouchers</h1>
                <p style="color: var(--muted); font-size: 13px; max-width: 480px; margin: 8px auto 0;">
                    Select a voucher to unlock AI-powered analytical insights. You will be routed through the secure Martha Solutions gateway.
                </p>
            </div>

            <!-- Pricing Grid -->
            <div class="specs-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                <!--  / 3 trials -->
                <div class="spec-card-3d" style="display:flex;flex-direction:column;gap:14px;border:2px solid var(--border);background:var(--bg-panel);padding:24px;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--green);border:1px solid var(--green);padding:2px 6px;border-radius:12px;">3 trials</div>
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">GHS 400</div>
                    </div>
                    <h2 style="font-size:36px;font-weight:900;line-height:1;font-family:var(--font-mono);"></h2>
                    <div style="font-size:15px;font-weight:700;color:var(--white);">3 prediction sessions</div>
                    <p style="font-size:12px;color:var(--muted);line-height:1.4;flex-grow:1;">Good for short sessions and testing the predictor.</p>
                    <button class="primary-btn-3d buy-btn" data-cost="25" data-trials="3" style="width:100%;text-align:center;font-size:12px;padding:12px 0;">
                        Buy voucher (400 GHS) &rarr;
                    </button>
                </div>

                <!--  / 5 trials -->
                <div class="spec-card-3d" style="display:flex;flex-direction:column;gap:14px;border:2px solid var(--border);background:var(--bg-panel);padding:24px;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--cyan);border:1px solid var(--cyan);padding:2px 6px;border-radius:12px;">5 trials</div>
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">GHS 1,120</div>
                    </div>
                    <h2 style="font-size:36px;font-weight:900;line-height:1;font-family:var(--font-mono);"></h2>
                    <div style="font-size:15px;font-weight:700;color:var(--white);">5 prediction sessions</div>
                    <p style="font-size:12px;color:var(--muted);line-height:1.4;flex-grow:1;">Extended sessions with deeper tracking.</p>
                    <button class="primary-btn-3d buy-btn" data-cost="70" data-trials="5" style="width:100%;text-align:center;font-size:12px;padding:12px 0;background:var(--cyan);">
                        Buy voucher (1,120 GHS) &rarr;
                    </button>
                </div>

                <!--  / 10 trials -->
                <div class="spec-card-3d" style="display:flex;flex-direction:column;gap:14px;border:2px solid var(--border);background:var(--bg-panel);padding:24px;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="font-family:var(--font-mono);font-size:11px;color:#ffb300;border:1px solid #ffb300;padding:2px 6px;border-radius:12px;">10 trials</div>
                        <div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);">GHS 1,600</div>
                    </div>
                    <h2 style="font-size:36px;font-weight:900;line-height:1;font-family:var(--font-mono);"></h2>
                    <div style="font-size:15px;font-weight:700;color:var(--white);">10 prediction sessions</div>
                    <p style="font-size:12px;color:var(--muted);line-height:1.4;flex-grow:1;">Maximum sessions per voucher.</p>
                    <button class="primary-btn-3d buy-btn" data-cost="100" data-trials="10" style="width:100%;text-align:center;font-size:12px;padding:12px 0;background:#ffb300;border-color:#000;">
                        Buy voucher (1,600 GHS) &rarr;
                    </button>
                </div>
            </div>
        </main>

        <footer class="landing-footer">
            <span class="footer-left"></span>
            <span class="footer-right">&copy; 2026 Precision Axis Ltd. [LOCAL TEST]</span>
        </footer>
    </div>

    <script>
    function showOverlay(type, message, subtext, extraHtml) {
        const old = document.getElementById('paxis-overlay');
        if (old) old.remove();
        const isLoading = type === 'loading';
        const isSuccess = type === 'success';
        const iconHtml = isLoading
            ? <div style="width:56px;height:56px;border:4px solid rgba(255,255,255,.15);border-top-color:#d4a017;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
            : isSuccess ? <div style="font-size:52px;margin-bottom:16px;">✅</div>
            : <div style="font-size:52px;margin-bottom:16px;">❌</div>;
        const color = (isLoading || isSuccess) ? '#d4a017' : '#ff3b30';
        const overlay = document.createElement('div');
        overlay.id = 'paxis-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,8,15,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;';
        overlay.innerHTML = 
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            
            <div style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:;margin-bottom:10px;"></div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:rgba(255,255,255,.55);max-width:380px;line-height:1.7;"></div>
            
            
        ;
        document.body.appendChild(overlay);
        return overlay;
    }

    function showVoucherSuccess(code, trials, email) {
        const old = document.getElementById('paxis-overlay');
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = 'paxis-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(5,8,15,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;';
        overlay.innerHTML = 
            <div style="font-size:52px;margin-bottom:12px;">🎟</div>
            <div style="font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:#d4a017;margin-bottom:6px;">Voucher Added!</div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:13px;color:rgba(255,255,255,.55);margin-bottom:20px;"> trials added to your account</div>
            <div style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:20px 32px;margin-bottom:20px;max-width:380px;width:100%;">
                <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.4);margin-bottom:6px;text-transform:uppercase;">Your Voucher Code</div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:24px;font-weight:700;color:#d4a017;letter-spacing:3px;"></div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:rgba(255,255,255,.4);margin-top:8px;"> trial &bull; Delivered to </div>
            </div>
            <div style="font-family:'Share Tech Mono',monospace;font-size:12px;color:rgba(255,255,255,.35);margin-bottom:24px;">[LOCAL TEST MODE]</div>
            <button onclick="document.getElementById('paxis-overlay').remove(); history.replaceState(null,'',location.pathname);" style="padding:12px 32px;background:#d4a017;border:none;color:#000;font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:700;cursor:pointer;border-radius:4px;">
                ✓ Done
            </button>
        ;
        document.body.appendChild(overlay);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const returnStatus = (urlParams.get('status') || '').toLowerCase();
        const returnRef    = urlParams.get('reference') || urlParams.get('trxref') || '';
        const sessionToken = urlParams.get('session') || '';

        let sessionEmail = '', sessionTrials = 3, sessionCost = 25;
        if (sessionToken && sessionToken.startsWith('ms_sess_')) {
            try {
                const decoded = JSON.parse(atob(sessionToken.replace('ms_sess_', '')));
                sessionEmail  = decoded.metadata?.custom_email || decoded.customerEmail || '';
                sessionTrials = decoded.metadata?.trials || 3;
                sessionCost   = decoded.metadata?.cost || 25;
            } catch(e) {}
        }

        const storedEmail = sessionEmail || localStorage.getItem('test_user_email') || 'user@test.com';

        if (returnStatus === 'cancelled' || returnStatus === 'abandoned') {
            showOverlay('error', 'Payment Cancelled', 'You cancelled the voucher payment. No charge was made. Click below to try again.');
        } else if (returnStatus === 'expired') {
            showOverlay('error', 'Session Expired', 'The payment window timed out (2-minute limit). Please select a plan to retry.');
        } else if (returnStatus === 'failed') {
            showOverlay('error', 'Payment Failed', 'Your voucher payment could not be completed. Please check your payment method and retry.');
        } else if (returnRef && returnStatus === 'success') {
            const overlay = showOverlay('loading', 'Adding Voucher to Your Account…', Payment confirmed. Generating your -trial voucher for , please wait.);
            (async () => {
                try {
                    const res = await fetch('/api/create-voucher', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reference: returnRef, email: storedEmail, trials: sessionTrials, cost: sessionCost })
                    });
                    const data = await res.json();
                    if (res.ok && data.success && data.code) {
                        showVoucherSuccess(data.code, data.trials, storedEmail);
                    } else {
                        throw new Error(data.error || 'Voucher creation failed');
                    }
                } catch(err) {
                    overlay.remove();
                    showOverlay('error', 'Voucher Error', err.message);
                }
            })();
        }

        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const trials = parseInt(btn.dataset.trials);
                const cost   = parseInt(btn.dataset.cost);
                let email = localStorage.getItem('test_user_email') || '';
                if (!email) {
                    email = prompt('Enter your email address for voucher delivery:');
                    if (!email || !email.includes('@')) { alert('Valid email required.'); return; }
                    localStorage.setItem('test_user_email', email.trim().toLowerCase());
                }
                email = email.trim().toLowerCase();

                btn.disabled = true;
                btn.textContent = 'Connecting gateway...';

                try {
                    const res = await fetch('/api/initialize-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: email,
                            amount: cost,
                            trials: trials,
                            is_voucher: true
                        })
                    });
                    const data = await res.json();
                    if (res.ok && data.success && data.checkout_url) {
                        window.location.href = data.checkout_url;
                    } else {
                        throw new Error(data.error || 'Failed to initialize payment.');
                    }
                } catch(err) {
                    alert('Error: ' + err.message);
                    btn.disabled = false;
                    btn.textContent = 'Buy voucher';
                }
            });
        });
    });
    </script>
</body>
</html>
"""

with open('c:/Users/mapia/OneDrive/Documents/resources/spin/local-test/hub-test.html', 'w', encoding='utf-8') as f:
    f.write(hub_html)

with open('c:/Users/mapia/OneDrive/Documents/resources/spin/local-test/pricing-test.html', 'w', encoding='utf-8') as f:
    f.write(pricing_html)

print('hub-test.html and pricing-test.html written')

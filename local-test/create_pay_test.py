import os

pay_html = """<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Secure Gateway Checkout — Martha Solutions [LOCAL TEST]</title>
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- QRCode.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <!-- Google Fonts: Syne + Plus Jakarta Sans + Space Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">

  <!-- Paystack Inline JS -->
  <script src="https://js.paystack.co/v1/inline.js"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            display: ['Syne', 'sans-serif'],
            sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            mono: ['"Space Mono"', 'monospace'],
          },
          colors: {
            gw: {
              ink: '#0e1015',
              cobalt: '#0038ff',
              cobaltHover: '#002bc7',
              canvas: '#f6f5f1',
              surface: '#ffffff',
              border: '#e4e2da',
              muted: '#5c6068',
              emerald: '#059669'
            }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gw-canvas text-gw-ink selection:bg-gw-cobalt selection:text-white flex flex-col min-h-screen">

  <!-- TEST BANNER -->
  <div class="bg-amber-500 text-black text-center font-mono text-xs font-bold py-2 px-4 shadow-sm">
    ⚠ LOCAL TEST GATEWAY — Paystack TEST Key (pk_test_5b14499f7eb5fd959faa6673ba889c8d7ba76985) — Test Card: 4084 0840 8408 4081
  </div>

  <!-- Gateway Top Bar -->
  <header class="bg-white border-b border-gw-border sticky top-0 z-40 shadow-xs">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
      
      <!-- Brand -->
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-lg bg-gw-ink text-white font-display flex items-center justify-center font-bold text-sm">M</span>
        <div>
          <span class="font-display font-extrabold text-sm sm:text-base tracking-tight text-gw-ink block leading-none">MARTHA SOLUTIONS</span>
          <span class="font-mono text-[9px] text-gw-muted block mt-1 tracking-wider uppercase">Secure Payment Checkout</span>
        </div>
      </div>

      <div class="flex items-center gap-2 font-mono text-[11px] text-gw-emerald bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
        <span>🔒</span>
        <span class="hidden sm:inline">256-Bit Encrypted Session</span>
        <span class="sm:hidden">Encrypted</span>
      </div>
    </div>
  </header>

  <main class="flex-grow py-8 sm:py-14">
    <div class="max-w-xl mx-auto px-4 sm:px-6">

      <!-- Checkout Container -->
      <div id="checkoutCard" class="bg-white rounded-2xl border border-gw-border shadow-sm overflow-hidden">
        
        <!-- Live Expiration Timer Bar (2 min window) -->
        <div id="sessionTimerBar" class="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 font-mono text-xs">
          <span class="flex items-center gap-1.5 font-medium">
            <svg class="w-3.5 h-3.5 animate-pulse text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><polyline points="12 6 12 12 16 14" stroke-width="2"/></svg>
            Session Expiry:
          </span>
          <span id="sessionCountdown" class="font-bold text-amber-900 tracking-wider">02:00</span>
        </div>

        <!-- Order Banner -->
        <div class="bg-gw-ink text-white p-6 sm:p-7 flex items-center justify-between border-b border-gw-ink">
          <div>
            <div class="font-mono text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Payment</div>
            <h1 class="font-display font-bold text-xl sm:text-2xl text-white mt-1">Secure Payment</h1>
            <p id="orderDescDisplay" class="text-xs text-slate-300 mt-1">Order Checkout Session</p>
          </div>
          <div class="text-right">
            <div class="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Total Due</div>
            <div id="amountDisplay" class="font-display text-2xl sm:text-3xl font-extrabold text-white mt-0.5">GHS 50.00</div>
          </div>
        </div>

        <!-- Session Content Body -->
        <div class="p-6 sm:p-8 space-y-6">
          
          <!-- Order Information Grid -->
          <div class="bg-gw-canvas p-4 sm:p-5 rounded-xl border border-gw-border space-y-3 font-mono text-xs">
            <div class="flex justify-between items-center">
              <span class="text-gw-muted">Order ID:</span>
              <span id="orderIdDisplay" class="font-bold text-gw-ink">MS-ACC-TEST</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gw-muted">Customer Email:</span>
              <span id="customerEmailDisplay" class="font-semibold text-gw-ink">customer@example.com</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gw-muted">Payment Ref:</span>
              <span id="gatewayRefDisplay" class="font-semibold text-gw-cobalt">MS-GW-TEST-...</span>
            </div>
          </div>

          <!-- Dynamic QR Code & Mobile Scan -->
          <div class="flex flex-col sm:flex-row items-center gap-6 p-4 sm:p-5 rounded-xl border border-gw-border bg-white">
            <div class="shrink-0 p-2 bg-gw-canvas rounded-lg border border-gw-border">
              <div id="qrCodeWrapper" class="w-24 h-24 flex items-center justify-center"></div>
            </div>
            <div class="text-center sm:text-left space-y-1">
              <div class="font-mono text-xs font-bold uppercase text-gw-ink">Instant Mobile Payment</div>
              <p class="text-xs text-gw-muted leading-relaxed">Scan with your phone camera to open this checkout session and complete payment seamlessly.</p>
            </div>
          </div>

          <!-- Payment Trigger Button -->
          <div class="space-y-3 pt-2">
            <button id="payButton" type="button" onclick="executeGatewayPayment()" class="w-full py-4 px-6 font-mono text-xs font-bold uppercase tracking-widest text-white bg-gw-cobalt hover:bg-gw-cobaltHover rounded-xl transition-all shadow-md shadow-gw-cobalt/25 hover:shadow-lg flex items-center justify-center gap-2">
              <span id="payButtonText">Complete Payment &rarr;</span>
            </button>

            <!-- Cancel Button -->
            <button id="cancelButton" type="button" onclick="cancelSession('cancelled')" class="w-full py-2.5 text-center font-mono text-xs text-gw-muted hover:text-gw-ink transition-colors">
              &larr; Cancel and return to store
            </button>
          </div>

          <!-- Trust Badges -->
          <div class="pt-4 border-t border-gw-border flex items-center justify-center gap-4 text-center font-mono text-[10px] text-gw-muted">
            <span>Powered by Paystack [TEST]</span>
            <span>&bull;</span>
            <span>Cards, Mobile Money &amp; Bank Transfer</span>
            <span>&bull;</span>
            <span>Instant Return</span>
          </div>

        </div>
      </div>

      <!-- EXPIRED STATE -->
      <div id="expiredCard" class="hidden bg-white rounded-2xl border border-red-200 p-8 sm:p-10 text-center space-y-6 shadow-sm">
        <div class="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto">
          ⏱
        </div>

        <div>
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">Session Expired</span>
          <h2 class="font-display font-bold text-2xl sm:text-3xl text-gw-ink mt-3">Payment Time Limit Exceeded</h2>
          <p class="text-xs sm:text-sm text-gw-muted mt-2">This payment session has expired (2-minute limit). Please return to the site and start a new payment.</p>
        </div>

        <button type="button" onclick="cancelSession('expired')" class="w-full py-3.5 px-4 font-mono text-xs font-bold uppercase tracking-wider text-white bg-gw-ink hover:bg-black rounded-lg transition-colors shadow-sm">
          &larr; Return to Site
        </button>
      </div>

      <!-- SUCCESS / REDIRECTING STATE -->
      <div id="successCard" class="hidden bg-white rounded-2xl border border-gw-border p-8 sm:p-10 text-center space-y-6 shadow-sm">
        <div class="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto shadow-md">
          &check;
        </div>

        <div>
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Payment Verified</span>
          <h2 class="font-display font-bold text-2xl sm:text-3xl text-gw-ink mt-3">Transaction Complete!</h2>
          <p class="text-xs sm:text-sm text-gw-muted mt-2">Returning you to complete your order...</p>
        </div>

        <div class="bg-gw-canvas p-4 rounded-xl border border-gw-border font-mono text-xs text-gw-muted space-y-1 text-left">
          <div><strong>Reference:</strong> <span id="verifiedRef" class="text-gw-ink">...</span></div>
          <div><strong>Status:</strong> <span class="text-emerald-700 font-bold">PAID / SUCCESS</span></div>
          <div class="pt-1 text-[11px] text-gw-muted">Auto-redirecting in <span id="redirectCountdown" class="font-bold text-gw-cobalt">2</span> seconds...</div>
        </div>

        <button type="button" onclick="executeReturnRedirect()" class="w-full py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider text-white bg-gw-ink hover:bg-black rounded-lg transition-colors">
          Click to Return Immediately &rarr;
        </button>
      </div>

    </div>
  </main>

  <footer class="border-t border-gw-border bg-white py-6">
    <div class="max-w-xl mx-auto px-4 text-center font-mono text-[11px] text-gw-muted">
      &copy; <span id="year"></span> Martha Solutions. All rights reserved. &bull; Secure Checkout [TEST]
    </div>
  </footer>

  <script>
    document.getElementById('year').textContent = new Date().getFullYear();

    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session') || '';
    const incomingReference = urlParams.get('reference') || urlParams.get('trxref');

    const SESSION_DURATION_MS = 120 * 1000; // 2 minutes limit
    let sessionTimerInterval = null;
    let isSessionExpired = false;

    let sessionData = {
      sessionId: sessionToken || '',
      merchantName: 'Payment',
      orderId: 'MS-ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      description: 'Account Activation Fee — GHS 50.00',
      amount: 50.00,
      currency: 'GHS',
      customerEmail: 'customer@example.com',
      reference: incomingReference || ('MS-GW-TEST-' + Date.now().toString(36).toUpperCase()),
      returnUrl: 'http://localhost:3333/auth-test.html',
      cancelUrl: 'http://localhost:3333/auth-test.html',
      createdAt: new Date().toISOString()
    };

    let callbackPayload = null;

    function handleSessionExpired() {
      if (isSessionExpired) return;
      isSessionExpired = true;
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      document.getElementById('checkoutCard').classList.add('hidden');
      document.getElementById('expiredCard').classList.remove('hidden');
    }

    function startExpiryTimer(remainingMs) {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);

      let timeLeft = Math.floor(remainingMs / 1000);
      const countdownEl = document.getElementById('sessionCountdown');
      const timerBarEl = document.getElementById('sessionTimerBar');

      function updateDisplay() {
        if (timeLeft <= 0) {
          countdownEl.textContent = '00:00';
          handleSessionExpired();
          return;
        }

        const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const secs = (timeLeft % 60).toString().padStart(2, '0');
        countdownEl.textContent = ${mins}:;

        if (timeLeft <= 30) {
          timerBarEl.className = 'flex items-center justify-between px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-900 font-mono text-xs';
        }
        timeLeft--;
      }

      updateDisplay();
      sessionTimerInterval = setInterval(updateDisplay, 1000);
    }

    function initSession() {
      if (sessionToken && sessionToken.startsWith('ms_sess_')) {
        try {
          const raw = atob(sessionToken.replace('ms_sess_', ''));
          const parsed = JSON.parse(raw);
          sessionData = { ...sessionData, ...parsed };
        } catch (e) {
          console.warn('Session decode fallback:', e);
        }
      }

      const createdTime = sessionData.createdAt ? new Date(sessionData.createdAt).getTime() : Date.now();
      const elapsed = Date.now() - createdTime;
      const remainingMs = SESSION_DURATION_MS - elapsed;

      if (remainingMs <= 0 && !incomingReference) {
        handleSessionExpired();
        return;
      }

      startExpiryTimer(remainingMs);

      const curr = (sessionData.currency || 'GHS').toUpperCase();
      const sym = curr === 'GHS' ? 'GHS ' : (curr === 'USD' ? '$' : curr + ' ');
      const formattedAmt = ${sym};

      document.getElementById('orderDescDisplay').textContent = sessionData.description || 'Order Payment';
      document.getElementById('amountDisplay').textContent = formattedAmt;
      document.getElementById('orderIdDisplay').textContent = sessionData.orderId || 'MS-ORD-TEST';
      document.getElementById('customerEmailDisplay').textContent = sessionData.customerEmail || 'customer@example.com';
      document.getElementById('gatewayRefDisplay').textContent = sessionData.reference;
      document.getElementById('payButtonText').textContent = Pay  with Paystack (TEST) →;

      // Render Dynamic QR Code
      const qrEl = document.getElementById('qrCodeWrapper');
      qrEl.innerHTML = '';
      new QRCode(qrEl, {
        text: window.location.href,
        width: 96,
        height: 96,
        colorDark: "#0e1015",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });

      if (incomingReference) {
        verifyAndComplete(incomingReference);
      }
    }

    function cancelSession(reason = 'cancelled') {
      const targetUrl = sessionData.cancelUrl || sessionData.returnUrl || 'http://localhost:3333/auth-test.html';
      try {
        const dest = new URL(targetUrl);
        dest.searchParams.set('status', reason);
        dest.searchParams.set('reference', sessionData.reference || '');
        dest.searchParams.set('session', sessionToken || '');
        window.location.href = dest.toString();
      } catch(e) {
        window.location.href = targetUrl;
      }
    }

    function executeGatewayPayment() {
      if (isSessionExpired) {
        alert('This payment session has expired (2-minute limit).');
        cancelSession('expired');
        return;
      }

      const subunit = Math.round(parseFloat(sessionData.amount || 50) * 100);
      const handler = PaystackPop.setup({
        key: 'pk_test_5b14499f7eb5fd959faa6673ba889c8d7ba76985',
        email: sessionData.customerEmail,
        amount: subunit,
        currency: sessionData.currency || 'GHS',
        ref: sessionData.reference,
        metadata: {
          custom_fields: [
            { display_name: "Payment For", variable_name: "payment_for", value: sessionData.description || "Account Activation Fee" }
          ]
        },
        callback: function(res) {
          verifyAndComplete(res.reference);
        },
        onClose: function() {
          if (confirm('Payment was closed. Would you like to return to the site?')) {
            cancelSession('abandoned');
          }
        }
      });
      handler.openIframe();
    }

    async function verifyAndComplete(ref) {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      document.getElementById('checkoutCard').classList.add('hidden');
      document.getElementById('expiredCard').classList.add('hidden');
      document.getElementById('successCard').classList.remove('hidden');
      document.getElementById('verifiedRef').textContent = ref;

      try {
        const verifyRes = await fetch(/api/gateway-verify?reference=);
        const verifyJson = await verifyRes.json();
        callbackPayload = verifyJson;
      } catch (err) {
        console.warn('Verify call error:', err);
      }

      let countdown = 2;
      const countEl = document.getElementById('redirectCountdown');
      const timer = setInterval(() => {
        countdown--;
        if (countEl) countEl.textContent = countdown;
        if (countdown <= 0) {
          clearInterval(timer);
          executeReturnRedirect();
        }
      }, 1000);
    }

    function executeReturnRedirect() {
      const targetUrl = sessionData.returnUrl || 'http://localhost:3333/auth-test.html';
      const dest = new URL(targetUrl);
      dest.searchParams.set('status', 'success');
      dest.searchParams.set('reference', sessionData.reference);
      dest.searchParams.set('session', sessionToken || '');
      window.location.href = dest.toString();
    }

    initSession();
  </script>
</body>
</html>
"""

with open('c:/Users/mapia/OneDrive/Documents/resources/spin/local-test/pay-test.html', 'w', encoding='utf-8') as f:
    f.write(pay_html)

print('pay-test.html written')

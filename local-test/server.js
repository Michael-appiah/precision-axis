const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = 3333;
const TEST_DIR = __dirname;

const mockAccounts = {};
const mockVouchers = {};
const mockSessions = {};

const server = http.createServer((req, res) => {
  const urlStr = req.url;
  const qIdx = urlStr.indexOf('?');
  const pathname = qIdx >= 0 ? urlStr.slice(0, qIdx) : urlStr;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // 1. Initialize Payment / Create Gateway Session
  if ((pathname === '/api/initialize-payment' || pathname === '/.netlify/functions/initialize-payment') && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { email, password, amount, is_voucher, trials } = parsed;
        const cleanEmail = (email || 'user@test.com').trim().toLowerCase();
        const numAmount = parseFloat(amount || 50);

        let ghsAmount, paymentTitle, callbackUrl, cancelUrl;
        if (is_voucher) {
          ghsAmount = (numAmount < 200) ? parseFloat((numAmount * 16.00).toFixed(2)) : parseFloat(numAmount.toFixed(2));
          callbackUrl = 'http://localhost:' + PORT + '/pricing-test.html';
          cancelUrl = 'http://localhost:' + PORT + '/pricing-test.html';
          const trialCount = trials || 3;
          paymentTitle = 'AI Prediction Voucher — ' + trialCount + ' Trial' + (trialCount > 1 ? 's' : '') + ' (GHS ' + ghsAmount.toFixed(2) + ')';
        } else {
          ghsAmount = (numAmount >= 100) ? parseFloat(numAmount.toFixed(2)) : 50.00;
          callbackUrl = 'http://localhost:' + PORT + '/auth-test.html';
          cancelUrl = 'http://localhost:' + PORT + '/auth-test.html';
          paymentTitle = 'Account Activation Fee — GHS ' + ghsAmount.toFixed(2);
        }

        const reference = 'MS-GW-TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const sessionData = {
          sessionId: '',
          reference: reference,
          amount: ghsAmount,
          currency: 'GHS',
          customerEmail: cleanEmail,
          customerName: cleanEmail.split('@')[0],
          merchantName: 'Payment',
          orderId: (is_voucher ? 'MS-VCH-' : 'MS-ACC-') + Math.random().toString(36).substring(2, 8).toUpperCase(),
          description: paymentTitle,
          returnUrl: callbackUrl,
          cancelUrl: cancelUrl,
          metadata: {
            is_voucher: !!is_voucher,
            trials: trials || 3,
            cost: numAmount,
            custom_email: cleanEmail,
            custom_password: password || ''
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 120 * 1000).toISOString(),
          expiresTimestamp: Date.now() + 120 * 1000,
          status: 'pending'
        };

        const sessionToken = 'ms_sess_' + Buffer.from(JSON.stringify(sessionData)).toString('base64');
        sessionData.sessionId = sessionToken;
        mockSessions[sessionToken] = sessionData;
        mockSessions[reference] = sessionData;

        const checkoutUrl = 'http://localhost:' + PORT + '/pay-test.html?session=' + encodeURIComponent(sessionToken);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          reference: reference,
          checkout_url: checkoutUrl,
          authorization_url: checkoutUrl,
          amount_ghs: ghsAmount,
          currency: 'GHS'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2. Gateway Verify
  if ((pathname === '/api/gateway-verify' || pathname === '/.netlify/functions/gateway-verify') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, 'http://localhost:' + PORT);
    const ref = parsedUrl.searchParams.get('reference');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: true,
      paid: true,
      reference: ref,
      signature: 'test_sig_' + Date.now()
    }));
    return;
  }

  // 3. Verify Payment & Create Account
  if ((pathname === '/api/verify-payment' || pathname === '/.netlify/functions/verify-payment') && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { reference, email, password } = JSON.parse(body || '{}');
        const cleanEmail = (email || 'test@user.com').trim().toLowerCase();
        const sessionToken = 'paxis_sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        mockAccounts[cleanEmail] = {
          email: cleanEmail,
          password: password || 'defaultPass123',
          paid_signup: true,
          is_active: true,
          reference: reference,
          sessionToken: sessionToken,
          createdAt: new Date().toISOString()
        };

        console.log('[MOCK ACCOUNT CREATED] ' + cleanEmail + ' | Ref: ' + reference);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          paid: true,
          email: cleanEmail,
          sessionToken: sessionToken,
          message: 'Account created successfully!'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Create Voucher
  if ((pathname === '/api/create-voucher' || pathname === '/.netlify/functions/create-voucher') && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { reference, email, trials, cost } = parsed;
        const cleanEmail = (email || 'test@user.com').trim().toLowerCase();
        const trialCount = parseInt(trials) || 3;
        const voucherCode = 'PAX-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        mockVouchers[voucherCode] = {
          code: voucherCode,
          trials: trialCount,
          cost: cost || 25,
          email: cleanEmail,
          reference: reference,
          createdAt: new Date().toISOString()
        };

        console.log('[MOCK VOUCHER CREATED] ' + voucherCode + ' (' + trialCount + ' trials) for ' + cleanEmail);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          paid: true,
          code: voucherCode,
          trials: trialCount,
          cost: cost || 25,
          email: cleanEmail
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(TEST_DIR, pathname === '/' ? 'auth-test.html' : pathname);
  if (pathname === '/style.css') filePath = path.join(TEST_DIR, '..', 'predictor_site', 'style.css');

  const ext = path.extname(filePath);
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + pathname);
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('====================================================');
  console.log('  LOCAL TEST SIMULATION RUNNING (PORT ' + PORT + ')');
  console.log('====================================================');
  console.log('  1. Auth / Account Creation Test:');
  console.log('     http://localhost:' + PORT + '/auth-test.html');
  console.log('  2. Voucher Purchase Test:');
  console.log('     http://localhost:' + PORT + '/pricing-test.html');
  console.log('  3. Gateway (Martha Checkout):');
  console.log('     http://localhost:' + PORT + '/pay-test.html');
  console.log('  Paystack Test Key: pk_test_5b14499f7eb5fd959faa6673ba889c8d7ba76985');
  console.log('  Zero real DB writes / Zero real money');
  console.log('====================================================');
  console.log('');
});

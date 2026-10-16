# MARTHA SOLUTIONS PAYMENT GATEWAY — AGENT & DEVELOPER SPECIFICATION
**Version:** 1.0.0  
**Host URL:** `https://marthasolutions.site`  
**Alternative Domain:** `https://martha-solutions.netlify.app`  
**Protocol:** HTTPS / REST JSON  

---

## 1. Overview for AI Agents & Automated Systems

The **Martha Solutions Payment Gateway** allows any autonomous agent, external web application, microservice, or e-commerce storefront to initiate hosted payment checkout sessions and receive cryptographically signed transaction callbacks.

### Core Lifecycle Flow:
1. **Agent/Client initializes a session:** `POST /api/gateway/session`
2. **Gateway returns:** `checkoutUrl` under `https://marthasolutions.site/pay.html?session=...`
3. **User/Agent navigates to `checkoutUrl`:** Pays via Paystack (Cards, Mobile Money, Apple Pay, USSD).
4. **Gateway auto-redirects to `returnUrl`:** Appends verified transaction parameters and HMAC SHA-256 signature.
5. **Agent/Server verifies payment:** `GET /api/gateway/verify?reference=<REF>`

---

## 2. API Endpoints Reference

### A. Initialize Gateway Session
Creates a new payment session and generates a hosted checkout URL.

- **URL:** `https://marthasolutions.site/api/gateway/session`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `X-API-Key: <YOUR_MERCHANT_API_KEY>`

#### Request Body Schema:
```json
{
  "amount": 50.00,
  "currency": "USD",
  "customerEmail": "client@domain.com",
  "customerName": "Jane Doe",
  "merchantName": "Acme SaaS Agent",
  "orderId": "ORD-2026-9812",
  "description": "Monthly Pro Subscription",
  "returnUrl": "https://external-agent-site.com/payment-success",
  "cancelUrl": "https://external-agent-site.com/checkout",
  "metadata": {
    "userId": "usr_99182",
    "tier": "enterprise"
  }
}
```

#### Field Specifications:
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | `Number` | **Yes** | Flat decimal amount (e.g. `50.00`, `10.00`). |
| `currency` | `String` | No | Currency code (`USD`, `GHS`, `NGN`). Defaults to `USD`. |
| `customerEmail` | `String` | **Yes** | Valid customer email address. |
| `customerName` | `String` | No | Customer full name or business. |
| `merchantName` | `String` | No | Your brand / service display name. |
| `orderId` | `String` | No | Your internal order or invoice ID. |
| `description` | `String` | No | Line item / purchase description. |
| `returnUrl` | `String` | **Yes** | Where to redirect the customer upon payment. |
| `cancelUrl` | `String` | No | Where to redirect if user cancels checkout. |
| `metadata` | `Object` | No | Arbitrary key-value data preserved across session. |

#### Successful Response (`200 OK`):
```json
{
  "status": true,
  "message": "Payment session created successfully.",
  "sessionId": "ms_sess_eyJzZXNzaW9uSWQi...",
  "checkoutUrl": "https://marthasolutions.site/pay.html?session=ms_sess_eyJzZXNzaW9uSWQi...",
  "reference": "MS-GW-MTWXYYXL-B1KU",
  "amount": 50.00,
  "currency": "USD",
  "paystackUrl": "https://checkout.paystack.com/kty4rypjy0pwn0y"
}
```

---

### B. Verify Transaction Endpoint
Allows external servers or background workers to verify transaction status by reference ID.

- **URL:** `https://marthasolutions.site/api/gateway/verify?reference=<REFERENCE_ID>`
- **Method:** `GET`
- **Headers:** `Content-Type: application/json`

#### Successful Response (`200 OK`):
```json
{
  "status": true,
  "paid": true,
  "message": "Payment verified successfully.",
  "signature": "8f3b2a1c9e8d7f6a5b4c3d2e1f0a9b8c...",
  "transaction": {
    "event": "payment.success",
    "status": "success",
    "reference": "MS-GW-MTWXYYXL-B1KU",
    "orderId": "ORD-2026-9812",
    "amount": 50.00,
    "currency": "USD",
    "customerEmail": "client@domain.com",
    "customerName": "Jane Doe",
    "merchantName": "Acme SaaS Agent",
    "channel": "card",
    "paidAt": "2026-09-11T12:37:55.100Z",
    "metadata": {
      "userId": "usr_99182",
      "tier": "enterprise"
    }
  }
}
```

---

## 3. Client Return Callback Specification

When the user completes payment on `marthasolutions.site/pay.html`, the gateway automatically redirects the browser to your `returnUrl` with the following query parameters:

```http
GET https://external-agent-site.com/payment-success?status=success&reference=MS-GW-MTWXYYXL-B1KU&orderId=ORD-2026-9812&amount=50&currency=USD&signature=8f3b2a...
```

### Callback Parameter Definitions:
- `status`: `success` | `failed`
- `reference`: Official Martha Solutions Gateway Reference ID.
- `orderId`: Your custom order identifier.
- `amount`: Confirmed paid amount.
- `currency`: Currency code.
- `signature`: HMAC SHA-256 signature for server-side verification.

---

## 4. Code Implementation Templates

### Node.js / JavaScript (Fetch / Axios)
```javascript
import fetch from 'node-fetch';

async function createCheckout(orderData) {
  const response = await fetch('https://marthasolutions.site/api/gateway/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.MARTHA_GATEWAY_KEY || 'ms_pk_live_default'
    },
    body: JSON.stringify({
      amount: orderData.amount,
      currency: 'USD',
      customerEmail: orderData.email,
      customerName: orderData.name,
      merchantName: 'My Service',
      orderId: orderData.orderId,
      returnUrl: 'https://mysite.com/success',
      cancelUrl: 'https://mysite.com/cancel'
    })
  });

  const data = await response.json();
  if (data.status && data.checkoutUrl) {
    return data.checkoutUrl; // Redirect user here
  }
  throw new Error(data.message || 'Gateway session creation failed');
}
```

### Python (Requests)
```python
import requests

def create_checkout_session(email, amount, order_id, return_url):
    url = "https://marthasolutions.site/api/gateway/session"
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": "ms_pk_live_default"
    }
    payload = {
        "amount": amount,
        "currency": "USD",
        "customerEmail": email,
        "merchantName": "Python Agent Service",
        "orderId": order_id,
        "returnUrl": return_url
    }
    
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    
    if data.get("status"):
        return data["checkoutUrl"]
    raise Exception(data.get("message", "Session initialization failed"))
```

### cURL
```bash
curl -X POST https://marthasolutions.site/api/gateway/session \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ms_pk_live_demo" \
  -d '{
    "amount": 25.00,
    "currency": "USD",
    "customerEmail": "buyer@example.com",
    "merchantName": "Terminal Agent",
    "orderId": "CLI-9912",
    "returnUrl": "https://httpbin.org/get"
  }'
```

---

## 5. Webhook Integration (Optional Direct Notification)
- **Live Webhook Endpoint:** `https://marthasolutions.site/.netlify/functions/paystack-webhook`
- **Signature Header:** `x-paystack-signature` (HMAC SHA-512)

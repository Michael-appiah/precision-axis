// In-memory Rate Limiter for Netlify Serverless Functions
const requestsMap = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, history] of requestsMap.entries()) {
        const valid = history.filter(timestamp => now - timestamp < 60000);
        if (valid.length === 0) {
            requestsMap.delete(ip);
        } else {
            requestsMap.set(ip, valid);
        }
    }
}, 300000);

/**
 * Checks if a request IP exceeds allowed rate limit.
 * @param {object} event - Netlify function event object
 * @param {number} maxRequests - Max allowed requests per window (default: 10)
 * @param {number} windowMs - Window duration in milliseconds (default: 60,000ms / 1 min)
 * @returns {boolean} true if request is allowed, false if rate limited
 */
function checkRateLimit(event, maxRequests = 10, windowMs = 60000) {
    const clientIp = event.headers['x-nf-client-connection-ip'] || 
                     event.headers['x-forwarded-for'] || 
                     event.headers['client-ip'] || 
                     '127.0.0.1';

    const now = Date.now();
    const timestamps = requestsMap.get(clientIp) || [];
    
    // Filter timestamps within the current window
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= maxRequests) {
        return false; // Rate limit exceeded
    }

    recent.push(now);
    requestsMap.set(clientIp, recent);
    return true; // Request allowed
}

module.exports = { checkRateLimit };

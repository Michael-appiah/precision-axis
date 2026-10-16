const crypto = require('crypto');

/**
 * Hashes a plain text password with a random salt using PBKDF2 (SHA-512).
 * Format returned: pbkdf2$salt$hash
 */
function hashPassword(password) {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `pbkdf2$${salt}$${hash}`;
}

/**
 * Verifies a plain text password against a stored hashed or legacy password.
 * Seamlessly supports legacy plain-text passwords for smooth migration!
 */
function verifyPassword(storedPassword, inputPassword) {
    if (!storedPassword || !inputPassword) return false;

    // Check if stored password is in PBKDF2 format
    if (storedPassword.startsWith('pbkdf2$')) {
        const parts = storedPassword.split('$');
        if (parts.length !== 3) return false;
        const salt = parts[1];
        const originalHash = parts[2];
        const inputHash = crypto.pbkdf2Sync(inputPassword, salt, 10000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(inputHash, 'hex'));
    }

    // Fallback: Legacy plain-text password match (timing-safe)
    const storedBuf = Buffer.from(storedPassword);
    const inputBuf = Buffer.from(inputPassword);
    if (storedBuf.length !== inputBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, inputBuf);
}

module.exports = { hashPassword, verifyPassword };

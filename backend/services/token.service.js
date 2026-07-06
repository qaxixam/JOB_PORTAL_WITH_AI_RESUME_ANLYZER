import { generateRandomToken, hashToken } from '../utils/crypto.js';

const TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

export const createResetToken = () => {
    const resetToken = generateRandomToken(32);
    const hashedToken = hashToken(resetToken);
    const expiresAt = Date.now() + TOKEN_EXPIRY;

    return {
        resetToken,      // send to user
        hashedToken,     // store in DB
        expiresAt        // expiration time
    };
};

export const verifyResetToken = (token, storedHashedToken) => {
    const hashedInput = hashToken(token);
    return hashedInput === storedHashedToken;
};
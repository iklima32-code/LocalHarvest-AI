import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derives a consistent 32-byte key from the environment variable.
 * We hash the key to ensure it is always the perfect length for the AES-256-GCM algorithm,
 * regardless of what string the user puts in their .env file.
 */
const getEncryptionKey = (): Buffer => {
    // Falls back to the Supabase Anon Key if ENCRYPTION_KEY isn't set yet during development
    const rawKey = process.env.ENCRYPTION_KEY || process.env.SUPABASE_ANON_KEY;
    if (!rawKey) {
        throw new Error('Missing encryption key in environment variables. Please add ENCRYPTION_KEY.');
    }
    return crypto.createHash('sha256').update(String(rawKey)).digest();
};

/**
 * Securely encrypts a plain text string (like an OAuth access token)
 * Returns a payload containing the Init Vector, Cipher Text, and Auth Tag.
 */
export function encryptToken(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // The Auth Tag acts as a mathematical signature to prove the data hasn't been tampered with
    const tag = cipher.getAuthTag();

    // Package it all into a single secure string stored in the database
    return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Securely decrypts a payload back into plain text.
 * Throws an error if the data has been tampered with or the wrong key is used.
 */
export function decryptToken(encryptedData: string): string {
    try {
        const key = getEncryptionKey();
        const parts = encryptedData.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const tag = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error("Token decryption failed:", error);
        throw new Error("Failed to decrypt secure data. Key may have changed or data is corrupted.");
    }
}

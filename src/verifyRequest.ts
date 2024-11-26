import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

// Function to verify Discord request signature
export function verifyRequest(signature: string, timestamp: string, body: Buffer): boolean {
    const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

    if (!PUBLIC_KEY) {
        console.error('DISCORD_PUBLIC_KEY is missing in environment variables.');
        return false;
    }

    const message = Buffer.concat([
        Buffer.from(timestamp, 'utf-8'),
        body,
    ]);

    try {
        return nacl.sign.detached.verify(
            message,
            Buffer.from(signature, 'hex'),
            Buffer.from(PUBLIC_KEY, 'hex')
        );
    } catch (error) {
        console.error('Failed to verify request signature:', error);
        return false;
    }
}

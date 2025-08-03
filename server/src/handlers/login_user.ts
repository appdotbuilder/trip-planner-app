
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Simple base64url encoding
const base64UrlEncode = (str: string): string => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Simple JWT creation
const createJWT = (payload: any): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  
  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Simple password verification
const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, storedHash] = hash.split(':');
  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return computedHash === storedHash;
};

export const loginUser = async (input: LoginInput): Promise<{ user: { id: number; email: string; username: string }; token: string }> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    // Verify password
    const isValidPassword = verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = createJWT({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

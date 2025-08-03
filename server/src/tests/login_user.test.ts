
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { createHash, randomBytes } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';

// Helper function to create password hash (same logic as would be used in create_user)
const createPasswordHash = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
};

// Helper function to decode JWT payload for testing
const decodeJWT = (token: string): any => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  
  const payload = parts[1];
  const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
  return JSON.parse(decoded);
};

// Test user data
const testUserData = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User'
};

const testLoginInput: LoginInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create user with hashed password
    const hashedPassword = createPasswordHash(testUserData.password);
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserData.email,
        username: testUserData.username,
        password_hash: hashedPassword,
        first_name: testUserData.first_name,
        last_name: testUserData.last_name
      })
      .returning()
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify user data
    expect(result.user.id).toEqual(userResult[0].id);
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.username).toEqual('testuser');
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
  });

  it('should return valid JWT token', async () => {
    // Create user
    const hashedPassword = createPasswordHash(testUserData.password);
    const userResult = await db.insert(usersTable)
      .values({
        email: testUserData.email,
        username: testUserData.username,
        password_hash: hashedPassword,
        first_name: testUserData.first_name,
        last_name: testUserData.last_name
      })
      .returning()
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify JWT token structure
    expect(result.token.split('.')).toHaveLength(3);
    
    // Decode and verify token payload
    const decoded = decodeJWT(result.token);
    expect(decoded.userId).toEqual(userResult[0].id);
    expect(decoded.email).toEqual('test@example.com');
    expect(decoded.username).toEqual('testuser');
    expect(decoded.exp).toBeDefined(); // Token should have expiration
    expect(decoded.iat).toBeDefined(); // Token should have issued at time
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create user
    const hashedPassword = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        username: testUserData.username,
        password_hash: hashedPassword,
        first_name: testUserData.first_name,
        last_name: testUserData.last_name
      })
      .execute();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid credentials/i);
  });

  it('should verify password hash correctly', async () => {
    // Create user
    const hashedPassword = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email,
        username: testUserData.username,
        password_hash: hashedPassword,
        first_name: testUserData.first_name,
        last_name: testUserData.last_name
      })
      .execute();

    const result = await loginUser(testLoginInput);

    // Verify the login was successful (no error thrown)
    expect(result.user.email).toEqual('test@example.com');
    expect(result.token).toBeDefined();

    // Verify that different passwords produce different hashes
    const differentHash = createPasswordHash('differentpassword');
    expect(differentHash).not.toEqual(hashedPassword);
  });

  it('should handle case-sensitive email lookup', async () => {
    // Create user with lowercase email
    const hashedPassword = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        email: testUserData.email.toLowerCase(),
        username: testUserData.username,
        password_hash: hashedPassword,
        first_name: testUserData.first_name,
        last_name: testUserData.last_name
      })
      .execute();

    // Try to login with different case
    const uppercaseInput: LoginInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'password123'
    };

    // Should fail because emails are case-sensitive in our implementation
    await expect(loginUser(uppercaseInput)).rejects.toThrow(/invalid credentials/i);
  });
});

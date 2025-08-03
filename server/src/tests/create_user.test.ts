
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(20);

    // Verify password hash is valid using Bun's password verification
    const isValidHash = await Bun.password.verify('password123', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);

    // Verify stored password hash
    const isValidHash = await Bun.password.verify('password123', users[0].password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should create user with nullable fields', async () => {
    const inputWithNulls: CreateUserInput = {
      email: 'minimal@example.com',
      username: 'minimaluser',
      password: 'password456',
      first_name: null,
      last_name: null
    };

    const result = await createUser(inputWithNulls);

    expect(result.email).toEqual('minimal@example.com');
    expect(result.username).toEqual('minimaluser');
    expect(result.first_name).toBeNull();
    expect(result.last_name).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.id).toBeDefined();

    // Verify password is still hashed correctly
    const isValidHash = await Bun.password.verify('password456', result.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should handle unique constraint violations', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create user with same email
    const duplicateEmailInput: CreateUserInput = {
      ...testInput,
      username: 'differentuser'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);

    // Try to create user with same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/unique/i);
  });
});

import { sqliteDb } from '../src/config/sqlite';
import bcrypt from 'bcrypt';

async function createTestUser() {
  try {
    console.log('Connecting to database...');
    await sqliteDb.connect();
    
    const email = 'admin@example.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    await sqliteDb.query(
      'INSERT OR REPLACE INTO users (email, password_hash, display_name, is_active) VALUES (?, ?, ?, ?)',
      [email, passwordHash, 'Admin User', true]
    );
    
    console.log('Test user created successfully:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    await sqliteDb.close();
  } catch (error) {
    console.error('Failed to create test user:', error);
    process.exit(1);
  }
}

createTestUser();
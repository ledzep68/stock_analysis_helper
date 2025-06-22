#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import db from '../src/config/database';

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const connectionTest = await db.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Database connection failed. Please check your database configuration.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Read and execute migration SQL
    const migrationPath = path.join(__dirname, '../database/migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔧 Executing database migration...');
    await db.query(migrationSQL);
    
    console.log('✅ Database schema created successfully');
    
    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const result = await db.query(tablesQuery);
    const tables = result.rows.map((row: any) => row.table_name);
    
    console.log('📊 Created tables:', tables);
    
    // Verify sample data
    console.log('🔍 Verifying sample data...');
    const companiesCountQuery = 'SELECT COUNT(*) as count FROM companies';
    const companiesResult = await db.query(companiesCountQuery);
    const companiesCount = companiesResult.rows[0].count;
    
    console.log(`📈 Sample companies inserted: ${companiesCount}`);
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run initialization
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
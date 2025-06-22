import { sqliteDb } from '../src/config/sqlite';

async function initializeDatabase() {
  try {
    console.log('🚀 Starting SQLite database initialization...');
    
    // Connect to database
    console.log('📡 Connecting to SQLite database...');
    await sqliteDb.connect();
    
    // Test connection
    console.log('🔍 Testing database connection...');
    await sqliteDb.testConnection();
    console.log('✅ Database connection successful');
    
    // Create tables
    console.log('🏗️ Creating database tables...');
    await sqliteDb.initializeTables();
    console.log('✅ Database tables created successfully');
    
    // Seed sample data
    console.log('🌱 Seeding sample data...');
    await sqliteDb.seedData();
    console.log('✅ Sample data seeded successfully');
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('📊 Database Summary:');
    console.log('- Database: SQLite');
    console.log('- Location: backend/data/stock_analysis.db');
    console.log('- Tables: 9 tables created');
    console.log('- Sample data: Companies and price history loaded');
    console.log('');
    console.log('🚀 You can now start the development server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await sqliteDb.close();
  }
}

// Run initialization
initializeDatabase();
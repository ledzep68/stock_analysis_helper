import { sqliteDb } from '../src/config/sqlite';

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    await sqliteDb.connect();
    
    console.log('Creating tables...');
    await sqliteDb.initializeTables();
    
    console.log('Seeding sample data...');
    await sqliteDb.seedData();
    
    console.log('Database initialization completed successfully!');
    
    // Test the database
    const result = await sqliteDb.query('SELECT COUNT(*) as count FROM stock_prices');
    console.log(`Stock price records: ${result.rows[0].count}`);
    
    const companies = await sqliteDb.query('SELECT COUNT(*) as count FROM companies');
    console.log(`Company records: ${companies.rows[0].count}`);
    
    await sqliteDb.close();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
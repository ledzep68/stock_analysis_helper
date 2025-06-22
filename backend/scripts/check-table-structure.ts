import db from '../src/config/database';

async function checkTableStructure() {
  try {
    console.log('Checking companies table structure...');
    
    const tableInfo = await db.all('PRAGMA table_info(companies)');
    console.log('Companies table columns:', tableInfo);
    
    // Check if we have any data
    const count = await db.get('SELECT COUNT(*) as count FROM companies');
    console.log('Number of companies:', count);
    
    // Show sample data
    const samples = await db.all('SELECT * FROM companies LIMIT 3');
    console.log('Sample data:', samples);
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();
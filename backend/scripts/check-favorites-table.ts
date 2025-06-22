import db from '../src/config/database';

async function checkFavoritesTable() {
  try {
    console.log('Checking favorites table structure...');
    
    const tableInfo = await db.all('PRAGMA table_info(favorites)');
    console.log('Favorites table columns:', tableInfo);
    
    // Check if we have any data
    const count = await db.get('SELECT COUNT(*) as count FROM favorites');
    console.log('Number of favorites:', count);
    
    // Show sample data
    const samples = await db.all('SELECT * FROM favorites LIMIT 3');
    console.log('Sample data:', samples);
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkFavoritesTable();
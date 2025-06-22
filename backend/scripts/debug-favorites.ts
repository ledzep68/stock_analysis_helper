import db from '../src/config/database';

async function debugFavorites() {
  try {
    console.log('=== Debugging Favorites Issue ===');
    
    // 1. Check favorites table structure
    console.log('\n1. Favorites table structure:');
    const favoritesInfo = await db.all('PRAGMA table_info(favorites)');
    console.log(favoritesInfo);
    
    // 2. Check companies table structure  
    console.log('\n2. Companies table structure:');
    const companiesInfo = await db.all('PRAGMA table_info(companies)');
    console.log(companiesInfo);
    
    // 3. Check if Toyota exists in companies table
    console.log('\n3. Toyota in companies table:');
    const toyota = await db.get('SELECT * FROM companies WHERE symbol = ?', ['7203']);
    console.log(toyota);
    
    // 4. Check all favorites
    console.log('\n4. All favorites:');
    const allFavorites = await db.all('SELECT * FROM favorites');
    console.log(allFavorites);
    
    // 5. Test the JOIN query
    console.log('\n5. JOIN query test:');
    const joinResult = await db.all(`
      SELECT 
        f.*,
        c.name as company_name,
        c.industry,
        c.sector
      FROM favorites f
      LEFT JOIN companies c ON f.symbol = c.symbol
      ORDER BY f.created_at DESC
    `);
    console.log(joinResult);
    
  } catch (error) {
    console.error('Error during debug:', error);
  }
}

debugFavorites();
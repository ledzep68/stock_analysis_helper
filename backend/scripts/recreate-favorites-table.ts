import db from '../src/config/database';

async function recreateFavoritesTable() {
  try {
    console.log('Recreating favorites table...');
    
    // Drop existing table
    await db.run('DROP TABLE IF EXISTS favorites');
    console.log('Dropped existing favorites table');
    
    // Create new table with correct schema
    const createTableQuery = `
      CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        notes TEXT,
        price_alert_enabled BOOLEAN DEFAULT 0,
        target_price DECIMAL(10,2),
        alert_type TEXT CHECK(alert_type IN ('above', 'below', 'change')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, symbol)
      )
    `;

    await db.run(createTableQuery);
    console.log('Created new favorites table with correct schema');

    // Check the created table
    const tableInfo = await db.all('PRAGMA table_info(favorites)');
    console.log('New table columns:', tableInfo);

  } catch (error: any) {
    console.error('Error recreating favorites table:', error);
  }
}

recreateFavoritesTable();
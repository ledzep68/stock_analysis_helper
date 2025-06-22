import db from '../src/config/database';

async function createFavoritesTable() {
  try {
    console.log('Creating favorites table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS favorites (
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
    console.log('Favorites table created successfully!');

    // Check the created table
    const tableInfo = await db.all('PRAGMA table_info(favorites)');
    console.log('Created table columns:', tableInfo);

  } catch (error) {
    console.error('Error creating favorites table:', error);
  }
}

createFavoritesTable();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

async function createAlertTriggersTable() {
  try {
    console.log('Creating price_alert_triggers table...');
    
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS price_alert_triggers (
          id TEXT PRIMARY KEY,
          alert_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          trigger_price REAL NOT NULL,
          previous_price REAL NOT NULL,
          change_percent REAL NOT NULL,
          timestamp TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          user_id TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('✅ price_alert_triggers table created');
          resolve();
        }
      });
    });
    
    console.log('✅ Alert triggers table setup completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

createAlertTriggersTable();
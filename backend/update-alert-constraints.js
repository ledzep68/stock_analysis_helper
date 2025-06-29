const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

async function updateAlertConstraints() {
  try {
    console.log('Updating alert type constraints...');
    
    // SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
    // First, rename the existing table
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE price_alerts RENAME TO price_alerts_old", (err) => {
        if (err) {
          console.error('Error renaming table:', err);
          reject(err);
        } else {
          console.log('✅ Renamed old table');
          resolve();
        }
      });
    });

    // Create new table with updated constraints
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE price_alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          symbol TEXT NOT NULL,
          alert_type TEXT NOT NULL CHECK (alert_type IN ('PRICE_TARGET', 'PRICE_CHANGE', 'VOLUME_SPIKE', 'price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal')),
          target_value REAL,
          current_value REAL,
          condition TEXT DEFAULT 'ABOVE' CHECK (condition IN ('ABOVE', 'BELOW', 'CHANGE_PERCENT')),
          is_active BOOLEAN DEFAULT true,
          triggered_at DATETIME,
          last_triggered TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT DEFAULT '{}',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating new table:', err);
          reject(err);
        } else {
          console.log('✅ Created new table with updated constraints');
          resolve();
        }
      });
    });

    // Copy data from old table to new table
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, current_value, condition, is_active, triggered_at, last_triggered, created_at, updated_at, metadata)
        SELECT user_id, symbol, alert_type, target_value, current_value, condition, is_active, triggered_at, last_triggered, created_at, updated_at, metadata
        FROM price_alerts_old
      `, (err) => {
        if (err) {
          console.error('Error copying data:', err);
          reject(err);
        } else {
          console.log('✅ Copied data to new table');
          resolve();
        }
      });
    });

    // Drop old table
    await new Promise((resolve, reject) => {
      db.run("DROP TABLE price_alerts_old", (err) => {
        if (err) {
          console.error('Error dropping old table:', err);
          reject(err);
        } else {
          console.log('✅ Dropped old table');
          resolve();
        }
      });
    });
    
    console.log('✅ Alert constraints updated successfully');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

updateAlertConstraints();
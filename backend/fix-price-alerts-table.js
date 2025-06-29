const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

async function fixPriceAlertsTable() {
  try {
    console.log('Adding missing condition column to price_alerts table...');
    
    // Add the missing condition column
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE price_alerts ADD COLUMN condition TEXT DEFAULT 'ABOVE'", (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log('Column already exists');
            resolve();
          } else {
            console.error('Error adding column:', err);
            reject(err);
          }
        } else {
          console.log('✅ Added condition column');
          resolve();
        }
      });
    });

    // Add metadata column if missing
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE price_alerts ADD COLUMN metadata TEXT DEFAULT '{}'", (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log('Metadata column already exists');
            resolve();
          } else {
            console.error('Error adding metadata column:', err);
            reject(err);
          }
        } else {
          console.log('✅ Added metadata column');
          resolve();
        }
      });
    });

    // Add last_triggered column if missing
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE price_alerts ADD COLUMN last_triggered TEXT", (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log('last_triggered column already exists');
            resolve();
          } else {
            console.error('Error adding last_triggered column:', err);
            reject(err);
          }
        } else {
          console.log('✅ Added last_triggered column');
          resolve();
        }
      });
    });
    
    console.log('✅ Price alerts table updated successfully');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

fixPriceAlertsTable();
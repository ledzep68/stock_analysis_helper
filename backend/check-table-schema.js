const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

async function checkTableSchema() {
  try {
    console.log('Checking price_alerts table schema...');
    
    // Check if table exists and get its schema
    await new Promise((resolve, reject) => {
      db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='price_alerts'", (err, row) => {
        if (err) {
          console.error('Error:', err);
          reject(err);
        } else if (row) {
          console.log('Current price_alerts table schema:');
          console.log(row.sql);
        } else {
          console.log('price_alerts table does not exist');
        }
        resolve();
      });
    });
    
    // Get column info
    await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(price_alerts)", (err, rows) => {
        if (err) {
          console.error('Error getting column info:', err);
          reject(err);
        } else if (rows && rows.length > 0) {
          console.log('\nColumn information:');
          rows.forEach(col => {
            console.log(`- ${col.name}: ${col.type} (nullable: ${!col.notnull})`);
          });
        } else {
          console.log('No column information available');
        }
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

checkTableSchema();
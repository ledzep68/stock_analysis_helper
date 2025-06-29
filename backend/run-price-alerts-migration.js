const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');
const db = new sqlite3.Database(dbPath);

async function runPriceAlertsMigration() {
  try {
    const migrationPath = path.join(__dirname, 'database/migrations/003_price_alerts.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running price alerts migration...');
    
    // Split SQL file into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await new Promise((resolve, reject) => {
        db.run(statement, (err) => {
          if (err) {
            console.error('Error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    
    console.log('✅ Price alerts migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    db.close();
  }
}

runPriceAlertsMigration();
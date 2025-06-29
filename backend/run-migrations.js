const fs = require('fs');
const path = require('path');

// SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'data', 'stock_analysis.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, 'database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log('Found migrations:', files);
    
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      
      // Split SQL file into individual statements
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              console.error(`Error in ${file}:`, err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      console.log(`✅ Migration ${file} completed`);
    }
    
    console.log('🎉 All migrations completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    db.close();
  }
}

runMigrations();
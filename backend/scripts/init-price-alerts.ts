import { sqliteDb } from '../src/config/sqlite';
import * as fs from 'fs';
import * as path from 'path';

async function initPriceAlerts() {
  try {
    console.log('🔔 Initializing price alerts tables...');

    // Connect to database
    await sqliteDb.connect();

    // Read and execute migration
    const migrationPath = path.join(__dirname, '../database/migrations/003_price_alerts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await sqliteDb.query(statement.trim());
    }

    console.log('✅ Price alerts tables created successfully');

    // Verify tables exist
    const result = await sqliteDb.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('price_alerts', 'price_alert_triggers')
    `);

    console.log('📊 Created tables:', result.rows.map((t: any) => t.name));

    // Start price alert monitoring
    const { priceAlertService } = await import('../src/services/priceAlertService');
    priceAlertService.startAlertMonitoring();

    console.log('🎉 Price alerts system initialized successfully!');

  } catch (error) {
    console.error('❌ Error initializing price alerts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initPriceAlerts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to initialize price alerts:', error);
      process.exit(1);
    });
}

export { initPriceAlerts };
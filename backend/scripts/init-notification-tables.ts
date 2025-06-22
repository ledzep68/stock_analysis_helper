import { sqliteDb } from '../src/config/sqlite';

async function initNotificationTables() {
  try {
    await sqliteDb.connect();

    console.log('Creating notification tables...');

    // Create notification_subscriptions table
    await sqliteDb.query(`
      CREATE TABLE IF NOT EXISTS notification_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, endpoint),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create notification_history table
    await sqliteDb.query(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        payload TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Check if price_alerts table exists, if not create it
    await sqliteDb.query(`
      CREATE TABLE IF NOT EXISTS price_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal')),
        target_value REAL NOT NULL,
        current_value REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        triggered_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Check if alert_history table exists, if not create it
    await sqliteDb.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER NOT NULL,
        triggered_value REAL NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (alert_id) REFERENCES price_alerts(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON notification_subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_alert ON alert_history(alert_id)'
    ];

    for (const index of indexes) {
      await sqliteDb.query(index);
    }

    console.log('Notification tables created successfully!');

    // Test inserting a sample alert
    console.log('Testing alert creation...');
    const sampleAlert = await sqliteDb.query(
      'INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, current_value) VALUES (?, ?, ?, ?, ?)',
      [3, 'TEST', 'price_above', 1000, 900]
    );
    console.log('Sample alert created:', sampleAlert);

    await sqliteDb.close();
  } catch (error) {
    console.error('Failed to initialize notification tables:', error);
    process.exit(1);
  }
}

initNotificationTables();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/stock_analysis.db');

console.log('🔍 price_alertsテーブル構造確認...\n');

// テーブル構造確認
db.all("PRAGMA table_info(price_alerts)", [], (err, columns) => {
    if (err) {
        console.error('❌ テーブル情報取得エラー:', err);
        return;
    }
    
    console.log('📊 price_alertsテーブル構造:');
    columns.forEach(col => {
        console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 既存のレコード確認
    db.all("SELECT * FROM price_alerts LIMIT 5", [], (err, rows) => {
        if (err) {
            console.error('❌ レコード取得エラー:', err);
        } else {
            console.log(`\n📋 既存アラート数: ${rows.length}`);
            if (rows.length > 0) {
                console.log('📄 サンプルレコード:', rows[0]);
            }
        }
        
        // 手動でアラート挿入テスト
        console.log('\n🧪 手動アラート挿入テスト...');
        const insertSQL = `
            INSERT INTO price_alerts (user_id, symbol, alert_type, target_value, current_value, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertSQL, [2, 'AAPL', 'price_above', 150.0, 100.0, 1], function(err) {
            if (err) {
                console.error('❌ 手動挿入エラー:', err);
            } else {
                console.log(`✅ 手動挿入成功 ID: ${this.lastID}`);
            }
            db.close();
        });
    });
});
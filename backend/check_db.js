const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/stock_analysis.db', (err) => {
    if (err) {
        console.error('データベース接続エラー:', err);
        return;
    }
    console.log('✅ SQLiteデータベースに接続成功');
});

// テーブル一覧表示
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error('テーブル一覧取得エラー:', err);
        return;
    }
    
    console.log('\n📊 データベーステーブル一覧:');
    rows.forEach((row) => {
        console.log(`- ${row.name}`);
    });
    
    // usersテーブルのスキーマ確認
    db.all("PRAGMA table_info(users)", [], (err, info) => {
        if (err) {
            console.error('usersテーブル情報取得エラー:', err);
        } else {
            console.log('\n🔍 usersテーブル構造:');
            info.forEach((col) => {
                console.log(`- ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
            });
        }
        
        // usersテーブルのレコード数確認
        db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
            if (err) {
                console.error('レコード数取得エラー:', err);
            } else {
                console.log(`\n📈 usersテーブルレコード数: ${row.count}`);
            }
            
            db.close();
        });
    });
});
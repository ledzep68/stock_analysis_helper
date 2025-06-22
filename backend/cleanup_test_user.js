const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/stock_analysis.db');

db.run("DELETE FROM users WHERE email = 'test@example.com'", function(err) {
    if (err) {
        console.error('削除エラー:', err);
    } else {
        console.log(`✅ ${this.changes}件のテストユーザーを削除しました`);
    }
    db.close();
});
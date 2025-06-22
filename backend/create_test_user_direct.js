const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

async function createTestUser() {
    const db = new sqlite3.Database('./data/stock_analysis.db');
    
    console.log('🔧 テストユーザーを直接作成中...');
    
    try {
        // パスワードをハッシュ化
        const passwordHash = await bcrypt.hash('TestPassword123@', 12);
        
        const insertSQL = `
            INSERT INTO users (email, password_hash, username, is_active, failed_login_attempts)
            VALUES (?, ?, ?, true, 0)
        `;
        
        db.run(insertSQL, ['testuser@example.com', passwordHash, 'testuser'], function(err) {
            if (err) {
                console.error('❌ ユーザー作成エラー:', err);
            } else {
                console.log(`✅ テストユーザー作成成功 ID: ${this.lastID}`);
                
                // user_settingsも作成
                const settingsSQL = `
                    INSERT INTO user_settings (user_id, display_currency, language, default_analysis_type)
                    VALUES (?, 'JPY', 'ja', 'comprehensive')
                `;
                
                db.run(settingsSQL, [this.lastID], (err) => {
                    if (err) {
                        console.log('⚠️ ユーザー設定作成エラー:', err);
                    } else {
                        console.log('✅ ユーザー設定作成完了');
                    }
                    db.close();
                });
            }
        });
        
    } catch (error) {
        console.error('❌ パスワードハッシュ化エラー:', error);
        db.close();
    }
}

createTestUser();
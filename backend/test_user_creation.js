const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/stock_analysis.db');

// user_sessionsテーブルが存在するかチェック
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'", [], (err, row) => {
    if (err) {
        console.error('テーブル確認エラー:', err);
        return;
    }
    
    if (row) {
        console.log('✅ user_sessionsテーブル存在確認');
    } else {
        console.log('❌ user_sessionsテーブルが存在しません');
        console.log('📝 user_sessionsテーブルを作成中...');
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;
        
        db.run(createTableSQL, function(err) {
            if (err) {
                console.error('テーブル作成エラー:', err);
            } else {
                console.log('✅ user_sessionsテーブル作成完了');
            }
            testUserCreation();
        });
    }
    
    if (row) {
        testUserCreation();
    }
});

function testUserCreation() {
    console.log('\n🧪 ユーザー作成テスト開始...');
    
    // 必要なフィールドを持つusersテーブル構造を確認
    db.all("PRAGMA table_info(users)", [], (err, columns) => {
        if (err) {
            console.error('テーブル情報エラー:', err);
            return;
        }
        
        console.log('\n📊 usersテーブル構造:');
        columns.forEach(col => {
            console.log(`- ${col.name}: ${col.type}`);
        });
        
        // 不足フィールドを追加
        const requiredColumns = ['username', 'is_active', 'failed_login_attempts', 'locked_until'];
        let alterCommands = [];
        
        requiredColumns.forEach(reqCol => {
            const exists = columns.find(col => col.name === reqCol);
            if (!exists) {
                let alterSQL = '';
                switch(reqCol) {
                    case 'username':
                        alterSQL = 'ALTER TABLE users ADD COLUMN username TEXT';
                        break;
                    case 'is_active':
                        alterSQL = 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true';
                        break;
                    case 'failed_login_attempts':
                        alterSQL = 'ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0';
                        break;
                    case 'locked_until':
                        alterSQL = 'ALTER TABLE users ADD COLUMN locked_until DATETIME';
                        break;
                }
                alterCommands.push(alterSQL);
            }
        });
        
        // ALTER文を実行
        if (alterCommands.length > 0) {
            console.log(`\n📝 ${alterCommands.length}個のカラムを追加中...`);
            
            alterCommands.forEach((sql, index) => {
                db.run(sql, function(err) {
                    if (err) {
                        console.error(`カラム追加エラー ${index + 1}:`, err);
                    } else {
                        console.log(`✅ カラム追加完了 ${index + 1}/${alterCommands.length}`);
                    }
                    
                    if (index === alterCommands.length - 1) {
                        setTimeout(() => {
                            attemptUserInsert();
                        }, 100);
                    }
                });
            });
        } else {
            attemptUserInsert();
        }
    });
}

function attemptUserInsert() {
    console.log('\n🔧 ユーザー挿入テスト...');
    
    const testUser = {
        email: 'test@example.com',
        password_hash: '$2b$12$test.hash.value',
        username: 'testuser'
    };
    
    const insertSQL = `
        INSERT INTO users (email, password_hash, username, is_active, failed_login_attempts)
        VALUES (?, ?, ?, true, 0)
    `;
    
    db.run(insertSQL, [testUser.email, testUser.password_hash, testUser.username], function(err) {
        if (err) {
            console.error('❌ ユーザー挿入エラー:', err);
        } else {
            console.log(`✅ ユーザー挿入成功 ID: ${this.lastID}`);
            
            // 挿入されたユーザーを確認
            db.get("SELECT * FROM users WHERE id = ?", [this.lastID], (err, row) => {
                if (err) {
                    console.error('ユーザー確認エラー:', err);
                } else {
                    console.log('📋 挿入されたユーザー:', row);
                }
                db.close();
            });
        }
    });
}
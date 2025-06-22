const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testAPIs() {
    console.log('🧪 API テスト開始...\n');

    // 1. ヘルスチェック
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('✅ ヘルスチェック:', response.data);
    } catch (error) {
        console.log('❌ ヘルスチェック失敗:', error.message);
    }

    // 2. 企業検索 (認証不要)
    try {
        const response = await axios.get(`${BASE_URL}/companies/search?query=Apple`);
        console.log('✅ 企業検索:', response.data.data.length, '件');
    } catch (error) {
        console.log('❌ 企業検索失敗:', error.message);
    }

    // 3. ユーザー登録
    try {
        const registerData = {
            email: 'testuser@example.com',
            password: 'TestPassword123@'
        };
        const response = await axios.post(`${BASE_URL}/auth/register`, registerData);
        console.log('✅ ユーザー登録:', response.data);
    } catch (error) {
        console.log('❌ ユーザー登録失敗:', error.response?.data || error.message);
    }

    // 4. ログイン
    let token = null;
    try {
        const loginData = {
            email: 'testuser@example.com',
            password: 'TestPassword123@'
        };
        const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
        token = response.data.token;
        console.log('✅ ログイン成功:', !!token);
    } catch (error) {
        console.log('❌ ログイン失敗:', error.response?.data || error.message);
    }

    if (token) {
        const headers = { Authorization: `Bearer ${token}` };

        // 5. レポートテンプレート取得
        try {
            const response = await axios.get(`${BASE_URL}/reports/templates`, { headers });
            console.log('✅ レポートテンプレート:', response.data.data.length, '件');
        } catch (error) {
            console.log('❌ レポートテンプレート失敗:', error.response?.data || error.message);
        }

        // 6. アラート一覧取得
        try {
            const response = await axios.get(`${BASE_URL}/alerts`, { headers });
            console.log('✅ アラート一覧:', response.data.data.length, '件');
        } catch (error) {
            console.log('❌ アラート一覧失敗:', error.response?.data || error.message);
        }

        // 7. 通知設定取得
        try {
            const response = await axios.get(`${BASE_URL}/notifications/preferences`, { headers });
            console.log('✅ 通知設定取得:', !!response.data.data);
        } catch (error) {
            console.log('❌ 通知設定取得失敗:', error.response?.data || error.message);
        }
    }

    console.log('\n🧪 APIテスト完了');
}

testAPIs().catch(console.error);
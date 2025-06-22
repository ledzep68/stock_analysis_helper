const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testAPIsWithNewUser() {
    console.log('🧪 新ユーザーでのAPI テスト開始...\n');

    // 3. ユーザー登録 (新しいメール)
    try {
        const registerData = {
            email: 'newtestuser@example.com',
            password: 'TestPassword123@'
        };
        const response = await axios.post(`${BASE_URL}/auth/register`, registerData);
        console.log('✅ ユーザー登録:', response.data.success);
    } catch (error) {
        console.log('❌ ユーザー登録失敗:', error.response?.data || error.message);
    }

    // 4. ログイン
    let token = null;
    try {
        const loginData = {
            email: 'newtestuser@example.com',
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

        // 8. アラート作成テスト
        try {
            const alertData = {
                symbol: 'AAPL',
                alertType: 'price_above',
                targetValue: 150.0
            };
            const response = await axios.post(`${BASE_URL}/alerts`, alertData, { headers });
            console.log('✅ アラート作成:', response.data.success);
        } catch (error) {
            console.log('❌ アラート作成失敗:', error.response?.data || error.message);
        }

        // 9. テクニカル分析API
        try {
            const response = await axios.get(`${BASE_URL}/technical/AAPL`, { headers });
            console.log('✅ テクニカル分析:', !!response.data.data);
        } catch (error) {
            console.log('❌ テクニカル分析失敗:', error.response?.data || error.message);
        }
    }

    console.log('\n🧪 新ユーザーAPIテスト完了');
}

testAPIsWithNewUser().catch(console.error);
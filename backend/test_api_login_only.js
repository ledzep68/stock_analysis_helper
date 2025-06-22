const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';

async function testLoginAndApis() {
    console.log('🧪 ログインAPIテスト開始...\n');

    // 1. ログイン (事前作成したユーザー)
    let token = null;
    try {
        const loginData = {
            email: 'testuser@example.com',
            password: 'TestPassword123@'
        };
        const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log('📋 ログインレスポンス:', response.data);
        token = response.data.data.token;
        console.log('✅ ログイン成功:', !!token);
        console.log('🔑 トークン取得:', token ? '成功' : '失敗');
    } catch (error) {
        console.log('❌ ログイン失敗:', error.response?.data || error.message);
        return;
    }

    if (token) {
        const headers = { Authorization: `Bearer ${token}` };

        // 2. レポートテンプレート取得
        try {
            const response = await axios.get(`${BASE_URL}/reports/templates`, { headers });
            console.log('✅ レポートテンプレート:', response.data.data.length, '件');
        } catch (error) {
            console.log('❌ レポートテンプレート失敗:', error.response?.data || error.message);
        }

        // 3. アラート一覧取得
        try {
            const response = await axios.get(`${BASE_URL}/alerts`, { headers });
            console.log('✅ アラート一覧:', response.data.data.length, '件');
        } catch (error) {
            console.log('❌ アラート一覧失敗:', error.response?.data || error.message);
        }

        // 4. 通知設定取得
        try {
            const response = await axios.get(`${BASE_URL}/notifications/preferences`, { headers });
            console.log('✅ 通知設定取得:', !!response.data.data);
        } catch (error) {
            console.log('❌ 通知設定取得失敗:', error.response?.data || error.message);
        }

        // 5. アラート作成テスト
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

        // 6. テクニカル分析API
        try {
            const response = await axios.get(`${BASE_URL}/technical/AAPL`, { headers });
            console.log('✅ テクニカル分析:', !!response.data.data);
        } catch (error) {
            console.log('❌ テクニカル分析失敗:', error.response?.data || error.message);
        }

        // 7. 企業詳細取得
        try {
            const response = await axios.get(`${BASE_URL}/companies/AAPL`, { headers });
            console.log('✅ 企業詳細取得:', !!response.data.data);
        } catch (error) {
            console.log('❌ 企業詳細取得失敗:', error.response?.data || error.message);
        }

        // 8. お気に入り一覧
        try {
            const response = await axios.get(`${BASE_URL}/favorites`, { headers });
            console.log('✅ お気に入り一覧:', response.data.data.length, '件');
        } catch (error) {
            console.log('❌ お気に入り一覧失敗:', error.response?.data || error.message);
        }
    }

    console.log('\n🧪 ログインAPIテスト完了');
}

testLoginAndApis().catch(console.error);
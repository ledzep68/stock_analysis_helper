const axios = require('axios');

const BASE_URL = 'http://localhost:5002/api';

async function testAlertCreation() {
    console.log('🧪 アラート作成詳細テスト開始...\n');

    // 1. ログイン
    let token = null;
    try {
        const loginData = {
            email: 'testuser@example.com',
            password: 'TestPassword123@'
        };
        const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
        token = response.data.data.token;
        console.log('✅ ログイン成功');
    } catch (error) {
        console.log('❌ ログイン失敗:', error.response?.data || error.message);
        return;
    }

    if (token) {
        const headers = { Authorization: `Bearer ${token}` };

        // 2. アラート作成テスト
        try {
            const alertData = {
                symbol: 'AAPL',
                alertType: 'price_above',
                targetValue: 150.0
            };
            console.log('📤 送信データ:', alertData);
            
            const response = await axios.post(`${BASE_URL}/alerts`, alertData, { headers });
            console.log('✅ アラート作成成功:', response.data);
        } catch (error) {
            console.log('❌ アラート作成失敗:');
            console.log('- ステータス:', error.response?.status);
            console.log('- データ:', error.response?.data);
            console.log('- メッセージ:', error.message);
            
            if (error.response?.data?.error) {
                console.log('- サーバーエラー詳細:', error.response.data.error);
            }
        }

        // 3. 現在のアラート一覧確認
        try {
            const response = await axios.get(`${BASE_URL}/alerts`, { headers });
            console.log('📋 現在のアラート件数:', response.data.data.length);
        } catch (error) {
            console.log('❌ アラート一覧取得失敗:', error.response?.data || error.message);
        }
    }

    console.log('\n🧪 アラート作成詳細テスト完了');
}

testAlertCreation().catch(console.error);
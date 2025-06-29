const { priceAlertService } = require('./dist/services/priceAlertService.js');

async function testPriceAlertService() {
  try {
    console.log('Testing priceAlertService...');
    
    const alertData = {
      symbol: '7203',
      alertType: 'PRICE_TARGET',
      targetValue: 3000,
      condition: 'ABOVE'
    };
    
    const userId = '2'; // string version of user ID
    
    console.log('Creating alert with data:', alertData);
    const result = await priceAlertService.createAlert(userId, alertData);
    console.log('Alert created successfully:', result);
    
  } catch (error) {
    console.error('❌ Error testing service:', error);
  }
}

testPriceAlertService();
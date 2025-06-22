import { favoritesService } from '../src/services/favoritesService';

async function testFavoritesDirectly() {
  try {
    console.log('=== Testing Favorites Service Directly ===');
    
    // Test adding a favorite
    console.log('\n1. Adding favorite for Toyota (7203)...');
    const addResult = await favoritesService.addFavorite({
      userId: '2',
      symbol: '7203',
      notes: 'テスト用',
      priceAlertEnabled: true,
      targetPrice: 600,
      alertType: 'above'
    });
    
    console.log('Add result:', addResult);
    
    // Get user favorites
    console.log('\n2. Getting user favorites...');
    const favorites = await favoritesService.getUserFavorites('2');
    console.log('User favorites:', favorites);
    
  } catch (error: any) {
    console.error('Error testing favorites:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFavoritesDirectly();
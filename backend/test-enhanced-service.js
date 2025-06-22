const { enhancedFinancialService } = require('./dist/services/enhancedFinancialService');
const { sqliteDb } = require('./dist/config/sqlite');

async function testEnhancedService() {
  try {
    console.log('Testing Enhanced Financial Service...');
    
    // Initialize database connection
    await sqliteDb.connect();
    await sqliteDb.initializeTables();
    await sqliteDb.seedData();
    
    // Test with a Japanese stock symbol
    const symbol = '3825'; // リミックスポイント
    
    console.log(`\nTesting enhanced financial data for ${symbol}...`);
    
    const result = await enhancedFinancialService.getEnhancedFinancialData(symbol);
    
    console.log('\n=== Enhanced Financial Analysis Results ===');
    console.log(`Company: ${result.companyName} (${result.symbol})`);
    console.log(`Industry: ${result.industry} | Sector: ${result.sector}`);
    console.log(`Current Price: ¥${result.currentPrice}`);
    console.log(`Market Cap: ¥${result.marketCap.toLocaleString()}`);
    
    console.log('\n--- Fundamentals ---');
    console.log(`P/E Ratio: ${result.fundamentals.peRatio}`);
    console.log(`P/B Ratio: ${result.fundamentals.pbRatio}`);
    console.log(`ROE: ${result.fundamentals.roe}%`);
    console.log(`ROA: ${result.fundamentals.roa}%`);
    console.log(`Dividend Yield: ${(result.fundamentals.dividendYield * 100).toFixed(2)}%`);
    
    console.log('\n--- Industry Comparison ---');
    console.log(`Industry: ${result.industryComparison.industry}`);
    console.log(`Sample Size: ${result.industryComparison.sampleSize}`);
    console.log('Percentiles:', result.industryComparison.percentiles);
    console.log('Ratings:', result.industryComparison.ratings);
    
    console.log('\n--- Valuation ---');
    console.log(`Fair Value: ¥${result.valuation.fairValue}`);
    console.log(`Target Price: ¥${result.valuation.targetPrice}`);
    console.log(`Upside: ${result.valuation.upside}%`);
    console.log(`Recommendation: ${result.valuation.recommendation}`);
    console.log(`Confidence: ${result.valuation.confidenceLevel}`);
    
    console.log('\n--- Data Quality ---');
    console.log(`Real Data %: ${result.dataQuality.realDataPercentage}%`);
    console.log(`Reliability Score: ${result.dataQuality.reliabilityScore}/100`);
    console.log(`Data Sources: ${result.dataQuality.dataSource.join(', ')}`);
    
    console.log('\n✅ Enhanced Financial Service test completed successfully!');
    
    await sqliteDb.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testEnhancedService();
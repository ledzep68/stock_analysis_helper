const axios = require('axios');

async function testYahooAPI() {
  try {
    console.log('Testing Yahoo Finance API for 3825.T...');
    
    // Yahoo Finance API エンドポイント
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/3825.T';
    const params = {
      range: '1d',
      interval: '1d',
      includePrePost: false,
      events: 'div,splits'
    };
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    console.log('\n=== Yahoo Finance API Response ===');
    console.log('Status:', response.status);
    
    const data = response.data;
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (meta) {
      console.log('\n--- Meta Information ---');
      console.log('Symbol:', meta.symbol);
      console.log('Regular Market Price:', meta.regularMarketPrice);
      console.log('Previous Close:', meta.previousClose);
      console.log('Market Cap:', meta.marketCap);
      console.log('Trailing P/E:', meta.trailingPE);
      console.log('EPS (TTM):', meta.epsTrailingTwelveMonths);
      console.log('Dividend Yield:', meta.dividendYield);
      console.log('52 Week High:', meta.fiftyTwoWeekHigh);
      console.log('52 Week Low:', meta.fiftyTwoWeekLow);
      console.log('Volume:', meta.regularMarketVolume);
      console.log('Avg Volume:', meta.averageDailyVolume10Day);
      
      console.log('\n--- All Available Meta Fields ---');
      Object.keys(meta).forEach(key => {
        console.log(`${key}:`, meta[key]);
      });
    } else {
      console.log('No meta data found');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    }
  }
}

testYahooAPI();
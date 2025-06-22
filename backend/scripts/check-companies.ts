import db from '../src/config/database';

async function checkCompanies() {
  try {
    console.log('🔍 Checking companies with market segments...');
    
    const companies = await db.all(`
      SELECT symbol, name, market_segment, exchange 
      FROM companies 
      ORDER BY symbol
    `);
    
    console.log('\n📊 Companies in database:');
    console.log('Symbol\t\tName\t\t\t\tMarket\t\tExchange');
    console.log('─'.repeat(80));
    
    companies.forEach(company => {
      console.log(`${company.symbol}\t\t${company.name.substring(0, 20)}\t\t${company.market_segment || 'N/A'}\t\t${company.exchange || 'N/A'}`);
    });
    
    console.log(`\n✅ Total companies: ${companies.length}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error);
  }
}

checkCompanies()
  .then(() => {
    console.log('Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });
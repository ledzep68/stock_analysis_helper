import { searchCompanies } from '../src/services/companyService';

async function testSearch() {
  try {
    console.log('🔍 Testing company search...');
    
    // 銘柄コード検索
    console.log('\n1. 銘柄コード検索 (6758):');
    const result1 = await searchCompanies('6758');
    console.log(JSON.stringify(result1, null, 2));
    
    // 日本語名検索
    console.log('\n2. 日本語名検索 (ソニー):');
    const result2 = await searchCompanies('ソニー');
    console.log(JSON.stringify(result2, null, 2));
    
    // 英語名検索
    console.log('\n3. 英語名検索 (Sony):');
    const result3 = await searchCompanies('Sony');
    console.log(JSON.stringify(result3, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testSearch()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
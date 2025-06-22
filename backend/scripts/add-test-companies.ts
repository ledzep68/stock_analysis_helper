import db from '../src/config/database';

async function addTestCompanies() {
  try {
    console.log('Adding test companies to database...');

    const companies = [
      {
        symbol: '7203',
        name: 'トヨタ自動車株式会社',
        industry: '輸送用機器',
        sector: '輸送用機器',
        market_cap: 28000000000000,
        description: '自動車製造業界のリーディングカンパニー'
      },
      {
        symbol: '9984',
        name: 'ソフトバンクグループ株式会社',
        industry: '情報・通信業',
        sector: '情報・通信業',
        market_cap: 8000000000000,
        description: '投資持株会社'
      },
      {
        symbol: '6758',
        name: 'ソニーグループ株式会社',
        industry: '電気機器',
        sector: '電気機器',
        market_cap: 15000000000000,
        description: 'エレクトロニクス・エンターテインメント企業'
      },
      {
        symbol: '8306',
        name: '三菱UFJフィナンシャル・グループ',
        industry: '銀行業',
        sector: '銀行業',
        market_cap: 12000000000000,
        description: '総合金融グループ'
      },
      {
        symbol: '4519',
        name: '中外製薬株式会社',
        industry: '医薬品',
        sector: '医薬品',
        market_cap: 4000000000000,
        description: '医薬品の研究開発・製造・販売'
      }
    ];

    for (const company of companies) {
      const insertQuery = `
        INSERT OR REPLACE INTO companies 
        (symbol, name, industry, sector, market_cap, updated_at) 
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `;

      await db.run(insertQuery, [
        company.symbol,
        company.name,
        company.industry,
        company.sector,
        company.market_cap
      ]);

      console.log(`Added company: ${company.symbol} - ${company.name}`);
    }

    console.log('Test companies added successfully!');
  } catch (error) {
    console.error('Error adding test companies:', error);
  }
}

addTestCompanies();
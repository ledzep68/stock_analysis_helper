const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./data/stock_analysis.db');

// サンプルESGデータ
const sampleESGData = [
  {
    symbol: '7203',
    company_name: 'トヨタ自動車',
    report_year: 2023,
    data_source: 'MANUAL',
    environmental_score: 85,
    carbon_emissions: 12.5,
    energy_consumption: 45,
    water_usage: 30,
    waste_management_score: 80,
    renewable_energy_ratio: 65,
    carbon_intensity: 25,
    social_score: 78,
    employee_satisfaction: 75,
    diversity_score: 60,
    safety_incidents: 2,
    community_investment: 50000000,
    human_rights_score: 85,
    labor_practices_score: 80,
    governance_score: 82,
    board_independence: 75,
    executive_compensation_ratio: 15,
    transparency_score: 85,
    audit_quality_score: 90,
    risk_management_score: 80,
    total_esg_score: 82,
    esg_grade: 'AA',
    esg_ranking: 1
  },
  {
    symbol: '6758',
    company_name: 'ソニーグループ',
    report_year: 2023,
    data_source: 'MANUAL',
    environmental_score: 88,
    carbon_emissions: 8.2,
    energy_consumption: 35,
    water_usage: 25,
    waste_management_score: 85,
    renewable_energy_ratio: 75,
    carbon_intensity: 20,
    social_score: 85,
    employee_satisfaction: 82,
    diversity_score: 78,
    safety_incidents: 1,
    community_investment: 75000000,
    human_rights_score: 90,
    labor_practices_score: 85,
    governance_score: 86,
    board_independence: 80,
    executive_compensation_ratio: 12,
    transparency_score: 90,
    audit_quality_score: 88,
    risk_management_score: 85,
    total_esg_score: 86,
    esg_grade: 'AA',
    esg_ranking: 2
  },
  {
    symbol: '9984',
    company_name: 'ソフトバンクグループ',
    report_year: 2023,
    data_source: 'MANUAL',
    environmental_score: 72,
    carbon_emissions: 15.8,
    energy_consumption: 55,
    water_usage: 40,
    waste_management_score: 70,
    renewable_energy_ratio: 45,
    carbon_intensity: 35,
    social_score: 75,
    employee_satisfaction: 70,
    diversity_score: 65,
    safety_incidents: 3,
    community_investment: 30000000,
    human_rights_score: 80,
    labor_practices_score: 75,
    governance_score: 70,
    board_independence: 65,
    executive_compensation_ratio: 25,
    transparency_score: 75,
    audit_quality_score: 70,
    risk_management_score: 70,
    total_esg_score: 72,
    esg_grade: 'A',
    esg_ranking: 3
  }
];

// 業界ベンチマークデータ
const industryBenchmarks = [
  {
    industry_code: 'AUTO',
    industry_name: '自動車製造業',
    benchmark_year: 2023,
    avg_environmental_score: 75,
    avg_social_score: 72,
    avg_governance_score: 78,
    avg_total_score: 75,
    std_environmental_score: 12,
    std_social_score: 10,
    std_governance_score: 8,
    std_total_score: 9,
    percentile_25_score: 65,
    percentile_50_score: 75,
    percentile_75_score: 85,
    percentile_90_score: 90,
    company_count: 25
  },
  {
    industry_code: 'TECH',
    industry_name: 'テクノロジー',
    benchmark_year: 2023,
    avg_environmental_score: 80,
    avg_social_score: 78,
    avg_governance_score: 82,
    avg_total_score: 80,
    std_environmental_score: 15,
    std_social_score: 12,
    std_governance_score: 10,
    std_total_score: 11,
    percentile_25_score: 70,
    percentile_50_score: 80,
    percentile_75_score: 88,
    percentile_90_score: 92,
    company_count: 40
  }
];

// データ挿入関数
function insertESGData() {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO esg_data (
      symbol, company_name, report_year, data_source,
      environmental_score, carbon_emissions, energy_consumption, water_usage,
      waste_management_score, renewable_energy_ratio, carbon_intensity,
      social_score, employee_satisfaction, diversity_score, safety_incidents,
      community_investment, human_rights_score, labor_practices_score,
      governance_score, board_independence, executive_compensation_ratio,
      transparency_score, audit_quality_score, risk_management_score,
      total_esg_score, esg_grade, esg_ranking, last_updated
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleESGData.forEach(data => {
    stmt.run([
      data.symbol,
      data.company_name,
      data.report_year,
      data.data_source,
      data.environmental_score,
      data.carbon_emissions,
      data.energy_consumption,
      data.water_usage,
      data.waste_management_score,
      data.renewable_energy_ratio,
      data.carbon_intensity,
      data.social_score,
      data.employee_satisfaction,
      data.diversity_score,
      data.safety_incidents,
      data.community_investment,
      data.human_rights_score,
      data.labor_practices_score,
      data.governance_score,
      data.board_independence,
      data.executive_compensation_ratio,
      data.transparency_score,
      data.audit_quality_score,
      data.risk_management_score,
      data.total_esg_score,
      data.esg_grade,
      data.esg_ranking,
      new Date().toISOString()
    ]);
  });

  stmt.finalize();
  console.log('ESGサンプルデータが挿入されました');
}

function insertBenchmarkData() {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO esg_industry_benchmarks (
      industry_code, industry_name, benchmark_year,
      avg_environmental_score, avg_social_score, avg_governance_score, avg_total_score,
      std_environmental_score, std_social_score, std_governance_score, std_total_score,
      percentile_25_score, percentile_50_score, percentile_75_score, percentile_90_score,
      company_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  industryBenchmarks.forEach(benchmark => {
    stmt.run([
      benchmark.industry_code,
      benchmark.industry_name,
      benchmark.benchmark_year,
      benchmark.avg_environmental_score,
      benchmark.avg_social_score,
      benchmark.avg_governance_score,
      benchmark.avg_total_score,
      benchmark.std_environmental_score,
      benchmark.std_social_score,
      benchmark.std_governance_score,
      benchmark.std_total_score,
      benchmark.percentile_25_score,
      benchmark.percentile_50_score,
      benchmark.percentile_75_score,
      benchmark.percentile_90_score,
      benchmark.company_count
    ]);
  });

  stmt.finalize();
  console.log('業界ベンチマークデータが挿入されました');
}

// 実行
insertESGData();
insertBenchmarkData();

db.close((err) => {
  if (err) {
    console.error('データベース終了エラー:', err);
  } else {
    console.log('ESGサンプルデータの挿入が完了しました');
  }
});
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { sqliteDb } from '../config/sqlite';
import { TechnicalAnalysisService } from './technicalAnalysisService';
// import { FinancialAnalysisService } from './financialAnalysisService';

interface ReportData {
  companyInfo: {
    symbol: string;
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
  };
  financialAnalysis: any;
  technicalAnalysis: any;
  userSettings: {
    language: string;
    currency: string;
    reportFormat: string;
  };
}

interface ReportTemplate {
  title: string;
  sections: string[];
  format: 'comprehensive' | 'summary' | 'technical' | 'fundamental';
}

export class ReportService {
  private static getReportTemplate(type: string): ReportTemplate {
    const templates: { [key: string]: ReportTemplate } = {
      comprehensive: {
        title: '包括的企業分析レポート',
        sections: ['executive_summary', 'company_overview', 'financial_analysis', 'technical_analysis', 'valuation', 'risks', 'recommendation'],
        format: 'comprehensive'
      },
      technical: {
        title: 'テクニカル分析レポート',
        sections: ['technical_summary', 'price_trends', 'indicators', 'signals', 'support_resistance'],
        format: 'technical'
      },
      fundamental: {
        title: 'ファンダメンタル分析レポート',
        sections: ['financial_summary', 'profitability', 'liquidity', 'efficiency', 'growth', 'valuation'],
        format: 'fundamental'
      },
      portfolio: {
        title: 'ポートフォリオ分析レポート',
        sections: ['portfolio_overview', 'asset_allocation', 'performance', 'risk_analysis', 'recommendations'],
        format: 'summary'
      }
    };

    return templates[type] || templates.comprehensive;
  }

  static async generateCompanyReport(
    symbol: string,
    userId: number,
    reportType: string = 'comprehensive'
  ): Promise<Buffer> {
    try {
      const template = this.getReportTemplate(reportType);
      const reportData = await this.gatherReportData(symbol, userId);
      
      return await this.createPDFReport(reportData, template);
    } catch (error) {
      console.error('Error generating company report:', error);
      throw error;
    }
  }

  static async generatePortfolioReport(userId: number): Promise<Buffer> {
    try {
      const template = this.getReportTemplate('portfolio');
      const portfolioData = await this.gatherPortfolioData(userId);
      
      return await this.createPDFReport(portfolioData, template);
    } catch (error) {
      console.error('Error generating portfolio report:', error);
      throw error;
    }
  }

  private static async gatherReportData(symbol: string, userId: number): Promise<ReportData> {
    try {
      // Get company basic info
      const companyQuery = `
        SELECT symbol, name, sector, current_price, price_change, change_percentage
        FROM companies
        WHERE symbol = ?
      `;
      const companyResult = await sqliteDb.query(companyQuery, [symbol]);
      const companyInfo = companyResult.rows[0] || {
        symbol,
        name: symbol,
        sector: 'Unknown',
        price: 0,
        change: 0,
        changePercent: 0
      };

      // Get user settings
      const userQuery = `
        SELECT display_currency, language, default_analysis_type
        FROM user_settings
        WHERE user_id = ?
      `;
      const userResult = await sqliteDb.query(userQuery, [userId]);
      const userSettings = userResult.rows[0] || {
        language: 'ja',
        currency: 'JPY',
        reportFormat: 'comprehensive'
      };

      // Get financial analysis
      let financialAnalysis = {};
      try {
        // financialAnalysis = await FinancialAnalysisService.getDetailedAnalysis(symbol);
        // This method will be implemented in future phases
        financialAnalysis = { summary: { overall_score: 'N/A' }, ratios: {} };
      } catch (error) {
        console.warn('Could not fetch financial analysis:', error);
      }

      // Get technical analysis
      let technicalAnalysis = {};
      try {
        technicalAnalysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
      } catch (error) {
        console.warn('Could not fetch technical analysis:', error);
      }

      return {
        companyInfo: {
          symbol: companyInfo.symbol,
          name: companyInfo.name || symbol,
          sector: companyInfo.sector || 'Unknown',
          price: parseFloat(companyInfo.current_price) || 0,
          change: parseFloat(companyInfo.price_change) || 0,
          changePercent: parseFloat(companyInfo.change_percentage) || 0
        },
        financialAnalysis,
        technicalAnalysis,
        userSettings: {
          language: userSettings.language || 'ja',
          currency: userSettings.display_currency || 'JPY',
          reportFormat: userSettings.default_analysis_type || 'comprehensive'
        }
      };
    } catch (error) {
      console.error('Error gathering report data:', error);
      throw error;
    }
  }

  static async gatherPortfolioData(userId: number): Promise<any> {
    try {
      // Get user's favorite companies as portfolio
      const portfolioQuery = `
        SELECT 
          f.symbol,
          f.notes,
          f.price_alert_target,
          c.name,
          c.current_price,
          c.price_change,
          c.change_percentage
        FROM favorites f
        LEFT JOIN companies c ON f.symbol = c.symbol
        WHERE f.user_id = ?
        ORDER BY f.created_at
      `;
      
      const portfolioResult = await sqliteDb.query(portfolioQuery, [userId]);
      
      return {
        holdings: portfolioResult.rows || [],
        totalValue: (portfolioResult.rows || []).reduce((sum: number, holding: any) => 
          sum + (parseFloat(holding.current_price) || 0), 0),
        totalChange: (portfolioResult.rows || []).reduce((sum: number, holding: any) => 
          sum + (parseFloat(holding.price_change) || 0), 0),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error gathering portfolio data:', error);
      throw error;
    }
  }

  private static async createPDFReport(data: any, template: ReportTemplate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        this.addReportHeader(doc, template, data);

        // Table of Contents
        this.addTableOfContents(doc, template);

        // Sections
        template.sections.forEach((section, index) => {
          if (index > 0) doc.addPage();
          this.addSection(doc, section, data);
        });

        // Footer
        this.addReportFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static addReportHeader(doc: any, template: ReportTemplate, data: any) {
    // Logo area (if available)
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .text('株式分析ヘルパー', 50, 50);

    // Report title
    doc.fontSize(18)
       .text(template.title, 50, 100);

    // Company info (if available)
    if (data.companyInfo) {
      doc.fontSize(14)
         .font('Helvetica')
         .text(`銘柄: ${data.companyInfo.symbol} - ${data.companyInfo.name}`, 50, 140)
         .text(`セクター: ${data.companyInfo.sector}`, 50, 160)
         .text(`現在価格: ¥${data.companyInfo.price.toFixed(2)}`, 50, 180)
         .text(`変動: ${data.companyInfo.change >= 0 ? '+' : ''}${data.companyInfo.change.toFixed(2)} (${data.companyInfo.changePercent.toFixed(2)}%)`, 50, 200);
    }

    // Date
    doc.fontSize(10)
       .text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, 50, 220);

    // Disclaimer
    doc.fontSize(8)
       .fillColor('gray')
       .text('※ 本レポートは投資判断の参考情報として提供されており、投資助言ではありません。', 50, 240)
       .text('投資の最終決定は、お客様ご自身の判断でなさるようお願いいたします。', 50, 250);

    doc.fillColor('black');
  }

  private static addTableOfContents(doc: any, template: ReportTemplate) {
    doc.addPage();
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('目次', 50, 50);

    let yPosition = 80;
    template.sections.forEach((section, index) => {
      const sectionTitle = this.getSectionTitle(section);
      doc.fontSize(12)
         .font('Helvetica')
         .text(`${index + 1}. ${sectionTitle}`, 70, yPosition)
         .text(`${index + 2}`, 500, yPosition);
      yPosition += 20;
    });
  }

  private static addSection(doc: any, section: string, data: any) {
    const sectionTitle = this.getSectionTitle(section);
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(sectionTitle, 50, 50);

    let yPosition = 80;

    switch (section) {
      case 'executive_summary':
        yPosition = this.addExecutiveSummary(doc, data, yPosition);
        break;
      case 'company_overview':
        yPosition = this.addCompanyOverview(doc, data, yPosition);
        break;
      case 'financial_analysis':
        yPosition = this.addFinancialAnalysis(doc, data, yPosition);
        break;
      case 'technical_analysis':
        yPosition = this.addTechnicalAnalysis(doc, data, yPosition);
        break;
      case 'valuation':
        yPosition = this.addValuation(doc, data, yPosition);
        break;
      case 'risks':
        yPosition = this.addRiskAnalysis(doc, data, yPosition);
        break;
      case 'recommendation':
        yPosition = this.addRecommendation(doc, data, yPosition);
        break;
      default:
        doc.fontSize(12)
           .text(`${section}セクションの内容を準備中です。`, 50, yPosition);
    }
  }

  private static getSectionTitle(section: string): string {
    const titles: { [key: string]: string } = {
      executive_summary: 'エグゼクティブサマリー',
      company_overview: '企業概要',
      financial_analysis: '財務分析',
      technical_analysis: 'テクニカル分析',
      valuation: '株価評価',
      risks: 'リスク分析',
      recommendation: '投資推奨',
      technical_summary: 'テクニカルサマリー',
      price_trends: '価格トレンド',
      indicators: 'テクニカル指標',
      signals: 'シグナル分析',
      support_resistance: 'サポート・レジスタンス',
      portfolio_overview: 'ポートフォリオ概要',
      asset_allocation: '資産配分',
      performance: 'パフォーマンス',
      risk_analysis: 'リスク分析'
    };

    return titles[section] || section;
  }

  private static addExecutiveSummary(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('投資判断サマリー:', 50, yPosition);
    yPosition += 20;

    if (data.technicalAnalysis?.signals) {
      const trend = data.technicalAnalysis.signals.trend;
      const strength = data.technicalAnalysis.signals.strength;
      
      doc.text(`・ トレンド: ${trend === 'bullish' ? '強気' : trend === 'bearish' ? '弱気' : '中立'}`, 70, yPosition);
      yPosition += 15;
      doc.text(`・ シグナル強度: ${strength?.toFixed(0) || 0}%`, 70, yPosition);
      yPosition += 15;
    }

    if (data.financialAnalysis?.summary) {
      doc.text(`・ 財務健全性: ${data.financialAnalysis.summary.overall_score || 'N/A'}`, 70, yPosition);
      yPosition += 15;
    }

    yPosition += 20;
    doc.text('主要リスク:', 50, yPosition);
    yPosition += 20;
    doc.text('・ 市場リスク: 株式市場全体の変動の影響を受けます', 70, yPosition);
    yPosition += 15;
    doc.text('・ 企業固有リスク: 業界動向や企業の業績に依存します', 70, yPosition);
    yPosition += 15;

    return yPosition + 30;
  }

  private static addCompanyOverview(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    if (data.companyInfo) {
      doc.fontSize(12)
         .text('基本情報:', 50, yPosition);
      yPosition += 20;

      doc.text(`銘柄コード: ${data.companyInfo.symbol}`, 70, yPosition);
      yPosition += 15;
      doc.text(`企業名: ${data.companyInfo.name}`, 70, yPosition);
      yPosition += 15;
      doc.text(`セクター: ${data.companyInfo.sector}`, 70, yPosition);
      yPosition += 15;
      doc.text(`現在株価: ¥${data.companyInfo.price.toFixed(2)}`, 70, yPosition);
      yPosition += 15;
    }

    return yPosition + 30;
  }

  private static addFinancialAnalysis(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('財務指標分析:', 50, yPosition);
    yPosition += 20;

    if (data.financialAnalysis?.ratios) {
      const ratios = data.financialAnalysis.ratios;
      
      if (ratios.profitability) {
        doc.text('収益性指標:', 70, yPosition);
        yPosition += 15;
        doc.text(`ROE: ${ratios.profitability.roe?.toFixed(2) || 'N/A'}%`, 90, yPosition);
        yPosition += 15;
        doc.text(`ROA: ${ratios.profitability.roa?.toFixed(2) || 'N/A'}%`, 90, yPosition);
        yPosition += 15;
      }

      if (ratios.liquidity) {
        yPosition += 10;
        doc.text('流動性指標:', 70, yPosition);
        yPosition += 15;
        doc.text(`流動比率: ${ratios.liquidity.current_ratio?.toFixed(2) || 'N/A'}`, 90, yPosition);
        yPosition += 15;
      }
    } else {
      doc.text('財務データを取得中...', 70, yPosition);
      yPosition += 15;
    }

    return yPosition + 30;
  }

  private static addTechnicalAnalysis(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('テクニカル指標:', 50, yPosition);
    yPosition += 20;

    if (data.technicalAnalysis?.indicators) {
      const indicators = data.technicalAnalysis.indicators;
      
      if (indicators.sma) {
        doc.text('移動平均線:', 70, yPosition);
        yPosition += 15;
        Object.entries(indicators.sma).forEach(([period, value]: [string, any]) => {
          doc.text(`SMA${period}: ¥${value.toFixed(2)}`, 90, yPosition);
          yPosition += 15;
        });
      }

      if (indicators.rsi) {
        yPosition += 10;
        doc.text(`RSI: ${indicators.rsi.toFixed(2)}`, 70, yPosition);
        yPosition += 15;
      }

      if (indicators.macd) {
        doc.text(`MACD: ${indicators.macd.macdLine?.toFixed(2) || 'N/A'}`, 70, yPosition);
        yPosition += 15;
      }
    } else {
      doc.text('テクニカルデータを取得中...', 70, yPosition);
      yPosition += 15;
    }

    return yPosition + 30;
  }

  private static addValuation(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('株価評価:', 50, yPosition);
    yPosition += 20;

    doc.text('DCF法による評価結果を準備中...', 70, yPosition);
    yPosition += 15;

    return yPosition + 30;
  }

  private static addRiskAnalysis(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('リスク要因:', 50, yPosition);
    yPosition += 20;

    const risks = [
      '市場リスク: 株式市場全体の変動の影響',
      '業界リスク: セクター固有の動向の影響', 
      '企業リスク: 企業固有の業績や戦略の影響',
      '為替リスク: 海外事業がある場合の為替変動の影響'
    ];

    risks.forEach(risk => {
      doc.text(`・ ${risk}`, 70, yPosition);
      yPosition += 15;
    });

    return yPosition + 30;
  }

  private static addRecommendation(doc: any, data: any, startY: number): number {
    let yPosition = startY;
    
    doc.fontSize(12)
       .text('投資推奨:', 50, yPosition);
    yPosition += 20;

    if (data.technicalAnalysis?.signals) {
      const trend = data.technicalAnalysis.signals.trend;
      const recommendations = data.technicalAnalysis.signals.recommendations || [];
      
      doc.text(`総合判断: ${trend === 'bullish' ? '買い推奨' : trend === 'bearish' ? '売り推奨' : '様子見推奨'}`, 70, yPosition);
      yPosition += 20;

      doc.text('根拠:', 70, yPosition);
      yPosition += 15;
      
      recommendations.forEach((rec: string) => {
        doc.text(`・ ${rec}`, 90, yPosition);
        yPosition += 15;
      });
    } else {
      doc.text('分析結果に基づく推奨を準備中...', 70, yPosition);
      yPosition += 15;
    }

    yPosition += 20;
    doc.fontSize(10)
       .fillColor('red')
       .text('※ これらの推奨は参考情報であり、投資助言ではありません。', 70, yPosition)
       .text('投資の最終判断は、お客様ご自身でお願いいたします。', 70, yPosition + 12);

    return yPosition + 40;
  }

  private static addReportFooter(doc: any) {
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .fillColor('gray')
         .text(`ページ ${i + 1} / ${pages.count}`, 500, 750)
         .text('株式分析ヘルパー - 投資分析レポート', 50, 750);
    }
  }

  static async saveReportToFile(buffer: Buffer, filename: string): Promise<string> {
    try {
      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      return filePath;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }

  static async exportToCSV(data: any[], filename: string): Promise<string> {
    try {
      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(','))
      ].join('\n');

      const filePath = path.join(reportsDir, filename);
      fs.writeFileSync(filePath, csvContent, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  static async exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1'): Promise<string> {
    try {
      const XLSX = require('xlsx');
      const reportsDir = path.join(__dirname, '../../reports');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate the Excel file
      const filePath = path.join(reportsDir, filename);
      XLSX.writeFile(workbook, filePath);

      return filePath;
    } catch (error) {
      console.error('Error exporting Excel:', error);
      throw error;
    }
  }

  static async exportPortfolioToExcel(userId: number, filename: string): Promise<string> {
    try {
      const XLSX = require('xlsx');
      const portfolioData = await this.gatherPortfolioData(userId);
      
      const reportsDir = path.join(__dirname, '../../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Portfolio Overview sheet
      const overviewData = [
        {
          '項目': '保有銘柄数',
          '値': portfolioData.holdings.length
        },
        {
          '項目': '総時価',
          '値': `¥${portfolioData.totalValue?.toFixed(2) || '0.00'}`
        },
        {
          '項目': '総損益',
          '値': `¥${portfolioData.totalChange?.toFixed(2) || '0.00'}`
        },
        {
          '項目': '最終更新',
          '値': new Date(portfolioData.lastUpdated).toLocaleString('ja-JP')
        }
      ];

      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'ポートフォリオ概要');

      // Holdings sheet
      const holdingsData = portfolioData.holdings.map((holding: any) => ({
        '銘柄コード': holding.symbol,
        '企業名': holding.name || holding.symbol,
        '現在価格': `¥${holding.current_price?.toFixed(2) || '0.00'}`,
        '前日比': `¥${holding.price_change?.toFixed(2) || '0.00'}`,
        '変動率': `${holding.change_percentage?.toFixed(2) || '0.00'}%`,
        'メモ': holding.notes || '',
        'アラート設定価格': holding.price_alert_target ? `¥${holding.price_alert_target}` : '-'
      }));

      const holdingsSheet = XLSX.utils.json_to_sheet(holdingsData);
      XLSX.utils.book_append_sheet(workbook, holdingsSheet, '保有銘柄');

      // Save the file
      const filePath = path.join(reportsDir, filename);
      XLSX.writeFile(workbook, filePath);

      return filePath;
    } catch (error) {
      console.error('Error exporting portfolio to Excel:', error);
      throw error;
    }
  }
}
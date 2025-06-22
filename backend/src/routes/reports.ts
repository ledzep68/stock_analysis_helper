import { Router, Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../utils/security';

const router = Router();

router.use(authenticateToken);

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

router.post('/company/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const { reportType = 'comprehensive', format = 'pdf' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }

    const validReportTypes = ['comprehensive', 'technical', 'fundamental', 'summary'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    const validFormats = ['pdf', 'csv', 'excel'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    if (format === 'pdf') {
      const pdfBuffer = await ReportService.generateCompanyReport(
        symbol.toUpperCase(),
        userId,
        reportType
      );

      const filename = `${symbol.toUpperCase()}_${reportType}_${new Date().getTime()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      // For CSV, we'll export basic company data
      const data = [
        {
          symbol: symbol.toUpperCase(),
          generated_at: new Date().toISOString(),
          report_type: reportType,
          user_id: userId
        }
      ];

      const filename = `${symbol.toUpperCase()}_${reportType}_${new Date().getTime()}.csv`;
      const filePath = await ReportService.exportToCSV(data, filename);
      res.download(filePath, filename);
    } else if (format === 'excel') {
      // For Excel, we'll export basic company data
      const data = [
        {
          symbol: symbol.toUpperCase(),
          generated_at: new Date().toISOString(),
          report_type: reportType,
          user_id: userId
        }
      ];

      const filename = `${symbol.toUpperCase()}_${reportType}_${new Date().getTime()}.xlsx`;
      const filePath = await ReportService.exportToExcel(data, filename, `${symbol} ${reportType}`);
      res.download(filePath, filename);
    }
  } catch (error) {
    console.error('Generate company report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate company report'
    });
  }
});

router.post('/portfolio', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { format = 'pdf' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const validFormats = ['pdf', 'csv', 'excel'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    if (format === 'pdf') {
      const pdfBuffer = await ReportService.generatePortfolioReport(userId);
      
      const filename = `portfolio_${userId}_${new Date().getTime()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      // Export portfolio data as CSV
      const portfolioData = await ReportService.gatherPortfolioData(userId);
      const data = portfolioData.holdings.map((holding: any) => ({
        symbol: holding.symbol,
        name: holding.name,
        current_price: holding.current_price,
        price_change: holding.price_change,
        change_percentage: holding.change_percentage,
        notes: holding.notes
      }));

      const filename = `portfolio_${userId}_${new Date().getTime()}.csv`;
      const filePath = await ReportService.exportToCSV(data, filename);
      res.download(filePath, filename);
    } else if (format === 'excel') {
      // Export portfolio data as Excel
      const filename = `portfolio_${userId}_${new Date().getTime()}.xlsx`;
      const filePath = await ReportService.exportPortfolioToExcel(userId, filename);
      res.download(filePath, filename);
    }
  } catch (error) {
    console.error('Generate portfolio report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio report'
    });
  }
});

router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const templates = [
      {
        id: 'comprehensive',
        name: '包括的分析レポート',
        description: '財務・テクニカル分析を含む総合的なレポート',
        sections: ['企業概要', '財務分析', 'テクニカル分析', '株価評価', 'リスク分析', '投資推奨'],
        estimatedPages: '8-12ページ'
      },
      {
        id: 'technical',
        name: 'テクニカル分析レポート',
        description: 'チャート分析と技術的指標に特化したレポート',
        sections: ['価格トレンド', 'テクニカル指標', 'シグナル分析', 'サポート・レジスタンス'],
        estimatedPages: '4-6ページ'
      },
      {
        id: 'fundamental',
        name: 'ファンダメンタル分析レポート',
        description: '財務データと企業価値分析に特化したレポート',
        sections: ['財務サマリー', '収益性分析', '流動性分析', '効率性分析', '成長性分析', '株価評価'],
        estimatedPages: '6-8ページ'
      },
      {
        id: 'portfolio',
        name: 'ポートフォリオレポート',
        description: '保有銘柄全体のパフォーマンス分析',
        sections: ['ポートフォリオ概要', '資産配分', 'パフォーマンス', 'リスク分析'],
        estimatedPages: '4-6ページ'
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Get report templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve report templates'
    });
  }
});

router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = '20' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-50)' });
    }

    // This would typically query a report_history table
    // For now, return mock data
    const mockHistory: any[] = [
      {
        id: 1,
        report_type: 'comprehensive',
        symbol: 'AAPL',
        generated_at: new Date(Date.now() - 86400000).toISOString(),
        file_size: '2.5MB',
        status: 'completed'
      },
      {
        id: 2,
        report_type: 'technical',
        symbol: '7203',
        generated_at: new Date(Date.now() - 172800000).toISOString(),
        file_size: '1.8MB',
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      data: mockHistory.slice(0, limitNum)
    });
  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve report history'
    });
  }
});

router.post('/preview/:symbol', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    const { reportType = 'comprehensive' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }

    // Generate a preview of what would be included in the report
    const preview = {
      reportType,
      symbol: symbol.toUpperCase(),
      estimatedSections: [] as string[],
      dataAvailability: {
        companyInfo: true,
        financialData: true,
        technicalData: true,
        historicalPrices: true
      },
      estimatedGenerationTime: '30-60秒',
      fileSize: '2-5MB'
    };

    const sectionMap: { [key: string]: string[] } = {
      comprehensive: ['エグゼクティブサマリー', '企業概要', '財務分析', 'テクニカル分析', '株価評価', 'リスク分析', '投資推奨'],
      technical: ['テクニカルサマリー', '価格トレンド', 'テクニカル指標', 'シグナル分析', 'サポート・レジスタンス'],
      fundamental: ['財務サマリー', '収益性分析', '流動性分析', '効率性分析', '成長性分析', '株価評価'],
      summary: ['概要', '主要指標', '簡易分析', '推奨事項']
    };

    preview.estimatedSections = sectionMap[reportType] || sectionMap.comprehensive;

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Generate report preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report preview'
    });
  }
});

export default router;
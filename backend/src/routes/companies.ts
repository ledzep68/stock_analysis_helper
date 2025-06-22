import { Router, Request, Response } from 'express';
import { searchCompanies, getCompanyData } from '../services/companyService';
import { validateSearchQuery, validateSymbol, createSecureApiResponse } from '../utils/security';
import { yahooFinanceThrottleMiddleware } from '../middleware/apiThrottling';
import { apiLimitMiddleware, addLimitStatusToResponse, ApiLimitRequest } from '../middleware/apiLimitMiddleware';

const router = Router();

router.get('/search', yahooFinanceThrottleMiddleware, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    // セキュアな入力検証
    const validatedQuery = validateSearchQuery(q);
    if (!validatedQuery) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid query parameter')
      );
    }

    const companies = await searchCompanies(validatedQuery);
    res.json(createSecureApiResponse(true, companies));
  } catch (error) {
    console.error('Error searching companies:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

router.get('/:symbol', 
  apiLimitMiddleware(), 
  addLimitStatusToResponse,
  yahooFinanceThrottleMiddleware, 
  async (req: ApiLimitRequest, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // セキュアな銘柄コード検証
    const validatedSymbol = validateSymbol(symbol);
    if (!validatedSymbol) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid symbol format')
      );
    }
    
    const companyData = await getCompanyData(validatedSymbol);
    
    if (!companyData) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Company not found')
      );
    }

    res.json(createSecureApiResponse(true, companyData));
  } catch (error) {
    console.error('Error getting company data:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Internal server error')
    );
  }
});

export default router;
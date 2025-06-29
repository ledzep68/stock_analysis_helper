import { Router, Request, Response } from 'express';
import { portfolioOptimizationService } from '../services/portfolioOptimizationService';
import { authenticateToken } from '../middleware/auth';
import { createSecureApiResponse } from '../utils/security';
import { ErrorHandler } from '../utils/error.handler';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

/**
 * ポートフォリオ最適化実行
 * POST /api/optimization/:portfolioId/optimize
 */
router.post('/:portfolioId/optimize', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { objective, constraints } = req.body;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    // バリデーション
    if (!objective || !objective.type || !objective.riskTolerance) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid optimization objective')
      );
    }

    const validObjectiveTypes = ['MAX_RETURN', 'MIN_RISK', 'MAX_SHARPE', 'RISK_PARITY', 'EQUAL_WEIGHT'];
    const validRiskTolerances = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];
    const validTimeHorizons = ['SHORT', 'MEDIUM', 'LONG'];

    if (!validObjectiveTypes.includes(objective.type)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid objective type')
      );
    }

    if (!validRiskTolerances.includes(objective.riskTolerance)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid risk tolerance')
      );
    }

    if (objective.timeHorizon && !validTimeHorizons.includes(objective.timeHorizon)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid time horizon')
      );
    }

    const startTime = Date.now();
    const optimizedPortfolio = await portfolioOptimizationService.optimizePortfolio(
      portfolioId,
      userId,
      objective,
      constraints || {}
    );
    const executionTime = Date.now() - startTime;

    // 実行ログ記録
    await recordOptimizationExecution(userId, portfolioId, 'OPTIMIZE', 'SUCCESS', executionTime);

    res.json(createSecureApiResponse(true, { 
      optimizedPortfolio,
      executionTimeMs: executionTime
    }));
  } catch (error) {
    const executionTime = Date.now() - (req as any).startTime || 0;
    await recordOptimizationExecution(
      (req as any).user?.id, 
      req.params.portfolioId, 
      'OPTIMIZE', 
      'FAILED', 
      executionTime, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to optimize portfolio', error);
  }
});

/**
 * 効率的フロンティア計算
 * GET /api/optimization/:portfolioId/efficient-frontier
 */
router.get('/:portfolioId/efficient-frontier', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { pointCount = '20', constraints } = req.query;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const points = parseInt(pointCount as string);
    if (isNaN(points) || points < 5 || points > 50) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Point count must be between 5 and 50')
      );
    }

    const constraintsObj = constraints ? JSON.parse(constraints as string) : {};
    
    const startTime = Date.now();
    const frontierPoints = await portfolioOptimizationService.calculateEfficientFrontier(
      portfolioId,
      userId,
      constraintsObj,
      points
    );
    const executionTime = Date.now() - startTime;

    res.json(createSecureApiResponse(true, { 
      frontierPoints,
      pointCount: frontierPoints.length,
      executionTimeMs: executionTime
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to calculate efficient frontier', error);
  }
});

/**
 * リスクパリティ最適化
 * POST /api/optimization/:portfolioId/risk-parity
 */
router.post('/:portfolioId/risk-parity', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { constraints } = req.body;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    // ダミーの共分散行列（実際の実装では実データを使用）
    const dummyCovariance = [
      [0.04, 0.02, 0.01],
      [0.02, 0.09, 0.015],
      [0.01, 0.015, 0.16]
    ];

    const riskParityResult = await portfolioOptimizationService.calculateRiskParity(
      dummyCovariance,
      constraints || {}
    );

    res.json(createSecureApiResponse(true, { riskParityResult }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to calculate risk parity', error);
  }
});

/**
 * リバランシング提案生成
 * POST /api/optimization/:portfolioId/rebalancing-proposal
 */
router.post('/:portfolioId/rebalancing-proposal', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { targetAllocations } = req.body;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    if (!targetAllocations || typeof targetAllocations !== 'object') {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Target allocations are required')
      );
    }

    // 配分の合計値チェック（許容誤差を考慮）
    const totalAllocation = Object.values(targetAllocations).reduce((sum: number, val: any) => sum + val, 0);
    if (Math.abs(totalAllocation - 1.0) > 0.01) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Target allocations must sum to 100%')
      );
    }

    const startTime = Date.now();
    const rebalancingProposal = await portfolioOptimizationService.generateRebalancingProposal(
      portfolioId,
      userId,
      targetAllocations
    );
    const executionTime = Date.now() - startTime;

    await recordOptimizationExecution(userId, portfolioId, 'REBALANCE', 'SUCCESS', executionTime);

    res.json(createSecureApiResponse(true, { 
      rebalancingProposal,
      totalActions: rebalancingProposal.length,
      executionTimeMs: executionTime
    }));
  } catch (error) {
    const executionTime = Date.now() - (req as any).startTime || 0;
    await recordOptimizationExecution(
      (req as any).user?.id, 
      req.params.portfolioId, 
      'REBALANCE', 
      'FAILED', 
      executionTime, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to generate rebalancing proposal', error);
  }
});

/**
 * 最適化履歴取得
 * GET /api/optimization/:portfolioId/history
 */
router.get('/:portfolioId/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { limit = '10', offset = '0' } = req.query;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    if (isNaN(limitNum) || isNaN(offsetNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid pagination parameters')
      );
    }

    // データベースから最適化履歴を取得
    const { db } = require('../config/database');
    const optimizations = await db.all(`
      SELECT 
        id, objective_type, risk_tolerance, time_horizon,
        expected_return, expected_risk, sharpe_ratio,
        allocations, metrics, estimated_costs, created_at
      FROM portfolio_optimizations 
      WHERE portfolio_id = ?
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [portfolioId, limitNum, offsetNum]);

    const totalCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM portfolio_optimizations 
      WHERE portfolio_id = ?
    `, [portfolioId]);

    const formattedOptimizations = optimizations.map((opt: any) => ({
      ...opt,
      allocations: JSON.parse(opt.allocations),
      metrics: JSON.parse(opt.metrics),
      estimatedCosts: JSON.parse(opt.estimated_costs)
    }));

    res.json(createSecureApiResponse(true, { 
      optimizations: formattedOptimizations,
      totalCount: totalCount.count,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: (offsetNum + limitNum) < totalCount.count
      }
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get optimization history', error);
  }
});

/**
 * 最適化プリセット取得
 * GET /api/optimization/presets
 */
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const { db } = require('../config/database');
    const presets = await db.all(`
      SELECT 
        id, name, description, objective_type, risk_tolerance, 
        time_horizon, constraints, is_default, created_at
      FROM optimization_presets 
      WHERE user_id = ? OR is_default = true
      ORDER BY is_default DESC, name ASC
    `, [userId]);

    const formattedPresets = presets.map((preset: any) => ({
      ...preset,
      constraints: JSON.parse(preset.constraints),
      isDefault: Boolean(preset.is_default)
    }));

    res.json(createSecureApiResponse(true, { 
      presets: formattedPresets,
      total: formattedPresets.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get optimization presets', error);
  }
});

/**
 * 最適化プリセット作成
 * POST /api/optimization/presets
 */
router.post('/presets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { name, description, objectiveType, riskTolerance, timeHorizon, constraints } = req.body;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    // バリデーション
    if (!name || !objectiveType || !riskTolerance || !timeHorizon) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Required fields: name, objectiveType, riskTolerance, timeHorizon')
      );
    }

    const validObjectiveTypes = ['MAX_RETURN', 'MIN_RISK', 'MAX_SHARPE', 'RISK_PARITY', 'EQUAL_WEIGHT'];
    const validRiskTolerances = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'];
    const validTimeHorizons = ['SHORT', 'MEDIUM', 'LONG'];

    if (!validObjectiveTypes.includes(objectiveType)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid objective type')
      );
    }

    if (!validRiskTolerances.includes(riskTolerance)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid risk tolerance')
      );
    }

    if (!validTimeHorizons.includes(timeHorizon)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid time horizon')
      );
    }

    const { db } = require('../config/database');
    const presetId = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO optimization_presets (
        id, user_id, name, description, objective_type, 
        risk_tolerance, time_horizon, constraints, is_default,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      presetId, userId, name, description || null, objectiveType,
      riskTolerance, timeHorizon, JSON.stringify(constraints || {}), false,
      now, now
    ]);

    const newPreset = await db.get(`
      SELECT * FROM optimization_presets WHERE id = ?
    `, [presetId]);

    res.status(201).json(createSecureApiResponse(true, { 
      preset: {
        ...newPreset,
        constraints: JSON.parse(newPreset.constraints),
        isDefault: Boolean(newPreset.is_default)
      }
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to create optimization preset', error);
  }
});

/**
 * 最適化プリセット更新
 * PUT /api/optimization/presets/:presetId
 */
router.put('/presets/:presetId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { presetId } = req.params;
    const { name, description, constraints } = req.body;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const { db } = require('../config/database');
    
    // プリセットの所有権確認
    const existingPreset = await db.get(`
      SELECT * FROM optimization_presets 
      WHERE id = ? AND user_id = ? AND is_default = false
    `, [presetId, userId]);

    if (!existingPreset) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Preset not found or not editable')
      );
    }

    const updateFields = [];
    const values = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }

    if (constraints !== undefined) {
      updateFields.push('constraints = ?');
      values.push(JSON.stringify(constraints));
    }

    if (updateFields.length === 0) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'No fields to update')
      );
    }

    updateFields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(presetId);

    await db.run(`
      UPDATE optimization_presets 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, values);

    const updatedPreset = await db.get(`
      SELECT * FROM optimization_presets WHERE id = ?
    `, [presetId]);

    res.json(createSecureApiResponse(true, { 
      preset: {
        ...updatedPreset,
        constraints: JSON.parse(updatedPreset.constraints),
        isDefault: Boolean(updatedPreset.is_default)
      }
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to update optimization preset', error);
  }
});

/**
 * 最適化プリセット削除
 * DELETE /api/optimization/presets/:presetId
 */
router.delete('/presets/:presetId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { presetId } = req.params;

    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const { db } = require('../config/database');
    
    const result = await db.run(`
      DELETE FROM optimization_presets 
      WHERE id = ? AND user_id = ? AND is_default = false
    `, [presetId, userId]);

    if (result.changes === 0) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Preset not found or not deletable')
      );
    }

    res.json(createSecureApiResponse(true, { 
      message: 'Preset deleted successfully' 
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to delete optimization preset', error);
  }
});

/**
 * 最適化実行ログ記録
 */
async function recordOptimizationExecution(
  userId: string,
  portfolioId: string,
  action: string,
  status: string,
  executionTime: number,
  errorMessage?: string
): Promise<void> {
  try {
    const { db } = require('../config/database');
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.run(`
      INSERT INTO optimization_execution_logs (
        id, user_id, portfolio_id, action, status, 
        execution_time_ms, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logId, userId, portfolioId, action, status,
      executionTime, errorMessage || null, new Date().toISOString()
    ]);
  } catch (error) {
    console.error('Failed to record optimization execution log:', error);
  }
}

export default router;
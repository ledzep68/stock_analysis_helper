import request from 'supertest';
import app from '../../src/index';
import { openSqliteDb } from '../../src/config/sqlite';
import jwt from 'jsonwebtoken';

describe('Optimization Routes', () => {
  let db: any;
  let authToken: string;
  const testUserId = 'test-user-123';
  const testPortfolioId = 'test-portfolio-123';

  beforeAll(async () => {
    db = await openSqliteDb();

    // JWTトークン生成
    authToken = jwt.sign(
      { id: testUserId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // テスト用ユーザー作成
    await db.run(`
      INSERT OR REPLACE INTO users (id, email, password_hash, is_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [testUserId, 'test@example.com', 'hashed_password', true, new Date().toISOString(), new Date().toISOString()]);

    // テスト用ポートフォリオ作成
    await db.run(`
      INSERT OR REPLACE INTO portfolios (id, user_id, name, description, initial_capital, currency, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [testPortfolioId, testUserId, 'テストポートフォリオ', 'テスト用', 1000000, 'JPY', true, new Date().toISOString(), new Date().toISOString()]);

    // テスト用取引データ
    const transactions = [
      { symbol: 'AAPL', type: 'BUY', quantity: 100, price: 150 },
      { symbol: 'MSFT', type: 'BUY', quantity: 80, price: 300 },
      { symbol: 'GOOGL', type: 'BUY', quantity: 50, price: 2500 }
    ];

    for (const tx of transactions) {
      await db.run(`
        INSERT OR REPLACE INTO portfolio_transactions 
        (id, portfolio_id, symbol, transaction_type, quantity, price, fees, transaction_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `tx_${tx.symbol}_${Date.now()}`, testPortfolioId, tx.symbol, tx.type, 
        tx.quantity, tx.price, 0, '2024-01-01', 'テスト取引', new Date().toISOString()
      ]);
    }
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await db.run('DELETE FROM portfolio_transactions WHERE portfolio_id = ?', [testPortfolioId]);
    await db.run('DELETE FROM portfolio_optimizations WHERE portfolio_id = ?', [testPortfolioId]);
    await db.run('DELETE FROM optimization_presets WHERE user_id = ?', [testUserId]);
    await db.run('DELETE FROM portfolios WHERE id = ?', [testPortfolioId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  describe('POST /api/optimization/:portfolioId/optimize', () => {
    it('正常な最適化リクエストを処理できる', async () => {
      const optimizationRequest = {
        objective: {
          type: 'MAX_SHARPE',
          riskTolerance: 'MODERATE',
          timeHorizon: 'MEDIUM'
        },
        constraints: {
          minWeight: 0.01,
          maxWeight: 0.5,
          maxRisk: 0.3,
          riskFreeRate: 0.02
        }
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(optimizationRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('optimizedPortfolio');
      expect(response.body.data).toHaveProperty('executionTimeMs');

      const portfolio = response.body.data.optimizedPortfolio;
      expect(portfolio.portfolioId).toEqual(testPortfolioId);
      expect(portfolio.objective).toEqual(optimizationRequest.objective);
      expect(Array.isArray(portfolio.allocations)).toBe(true);
      expect(typeof portfolio.expectedReturn).toBe('number');
      expect(typeof portfolio.expectedRisk).toBe('number');
      expect(typeof portfolio.sharpeRatio).toBe('number');
    });

    it('認証なしでアクセスするとエラーが返される', async () => {
      const optimizationRequest = {
        objective: {
          type: 'MAX_SHARPE',
          riskTolerance: 'MODERATE',
          timeHorizon: 'MEDIUM'
        }
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .send(optimizationRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('無効な目標タイプでバリデーションエラーが返される', async () => {
      const invalidRequest = {
        objective: {
          type: 'INVALID_TYPE',
          riskTolerance: 'MODERATE',
          timeHorizon: 'MEDIUM'
        }
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid objective type');
    });

    it('必須フィールドが不足している場合バリデーションエラーが返される', async () => {
      const incompleteRequest = {
        objective: {
          type: 'MAX_SHARPE'
          // riskToleranceが不足
        }
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid optimization objective');
    });
  });

  describe('GET /api/optimization/:portfolioId/efficient-frontier', () => {
    it('効率的フロンティアを計算できる', async () => {
      const response = await request(app)
        .get(`/api/optimization/${testPortfolioId}/efficient-frontier`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          pointCount: '15',
          constraints: JSON.stringify({ minWeight: 0.01, maxWeight: 0.5 })
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('frontierPoints');
      expect(response.body.data).toHaveProperty('pointCount');
      expect(response.body.data).toHaveProperty('executionTimeMs');

      const points = response.body.data.frontierPoints;
      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toEqual(15);

      points.forEach((point: any) => {
        expect(point).toHaveProperty('risk');
        expect(point).toHaveProperty('return');
        expect(point).toHaveProperty('sharpeRatio');
        expect(point).toHaveProperty('allocations');
      });
    });

    it('ポイント数が範囲外の場合エラーが返される', async () => {
      const response = await request(app)
        .get(`/api/optimization/${testPortfolioId}/efficient-frontier`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ pointCount: '100' }) // 50を超える
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Point count must be between 5 and 50');
    });
  });

  describe('POST /api/optimization/:portfolioId/risk-parity', () => {
    it('リスクパリティ最適化を実行できる', async () => {
      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/risk-parity`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          constraints: {
            minWeight: 0.05,
            maxWeight: 0.6
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('riskParityResult');

      const result = response.body.data.riskParityResult;
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('riskContributions');
      expect(result).toHaveProperty('totalRisk');
      expect(result.weights).to.be.an('array');
    });
  });

  describe('POST /api/optimization/:portfolioId/rebalancing-proposal', () => {
    it('リバランシング提案を生成できる', async () => {
      const targetAllocations = {
        'AAPL': 0.4,
        'MSFT': 0.35,
        'GOOGL': 0.25
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/rebalancing-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetAllocations })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rebalancingProposal');
      expect(response.body.data).toHaveProperty('totalActions');
      expect(response.body.data).toHaveProperty('executionTimeMs');

      const proposal = response.body.data.rebalancingProposal;
      expect(Array.isArray(proposal)).toBe(true);
    });

    it('配分の合計が100%でない場合エラーが返される', async () => {
      const invalidAllocations = {
        'AAPL': 0.5,
        'MSFT': 0.3
        // 合計80%
      };

      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/rebalancing-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetAllocations: invalidAllocations })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Target allocations must sum to 100%');
    });
  });

  describe('GET /api/optimization/:portfolioId/history', () => {
    it('最適化履歴を取得できる', async () => {
      // まず最適化を実行して履歴を作成
      await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          objective: {
            type: 'MAX_SHARPE',
            riskTolerance: 'MODERATE',
            timeHorizon: 'MEDIUM'
          }
        });

      const response = await request(app)
        .get(`/api/optimization/${testPortfolioId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: '10', offset: '0' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('optimizations');
      expect(response.body.data).toHaveProperty('totalCount');
      expect(response.body.data).toHaveProperty('pagination');

      const optimizations = response.body.data.optimizations;
      expect(Array.isArray(optimizations)).toBe(true);
      expect(optimizations.length).toBeGreaterThan(0);
    });

    it('無効なページネーションパラメータでエラーが返される', async () => {
      const response = await request(app)
        .get(`/api/optimization/${testPortfolioId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: '200', offset: '0' }) // 100を超える
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid pagination parameters');
    });
  });

  describe('Preset Management', () => {
    describe('GET /api/optimization/presets', () => {
      it('プリセット一覧を取得できる', async () => {
        const response = await request(app)
          .get('/api/optimization/presets')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('presets');
        expect(response.body.data).toHaveProperty('total');

        const presets = response.body.data.presets;
        expect(Array.isArray(presets)).toBe(true);
        // デフォルトプリセットが含まれているはず
        expect(presets.length).toBeGreaterThan(0);
      });
    });

    describe('POST /api/optimization/presets', () => {
      it('新しいプリセットを作成できる', async () => {
        const newPreset = {
          name: 'テスト戦略',
          description: 'テスト用の最適化戦略',
          objectiveType: 'MAX_SHARPE',
          riskTolerance: 'MODERATE',
          timeHorizon: 'MEDIUM',
          constraints: {
            minWeight: 0.02,
            maxWeight: 0.4,
            maxRisk: 0.25
          }
        };

        const response = await request(app)
          .post('/api/optimization/presets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newPreset)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('preset');

        const preset = response.body.data.preset;
        expect(preset.name).toEqual(newPreset.name);
        expect(preset.objective_type).toEqual(newPreset.objectiveType);
        expect(preset.risk_tolerance).toEqual(newPreset.riskTolerance);
      });

      it('必須フィールドが不足している場合エラーが返される', async () => {
        const incompletePreset = {
          name: 'テスト戦略'
          // その他の必須フィールドが不足
        };

        const response = await request(app)
          .post('/api/optimization/presets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompletePreset)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Required fields');
      });
    });
  });

  describe('Error Handling', () => {
    it('存在しないポートフォリオIDでエラーが返される', async () => {
      const response = await request(app)
        .post('/api/optimization/non-existent-portfolio/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          objective: {
            type: 'MAX_SHARPE',
            riskTolerance: 'MODERATE',
            timeHorizon: 'MEDIUM'
          }
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('無効なJWTトークンでエラーが返される', async () => {
      const response = await request(app)
        .post(`/api/optimization/${testPortfolioId}/optimize`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          objective: {
            type: 'MAX_SHARPE',
            riskTolerance: 'MODERATE',
            timeHorizon: 'MEDIUM'
          }
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
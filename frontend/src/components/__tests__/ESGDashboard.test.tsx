import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ESGDashboard from '../ESGDashboard';
import { api } from '../../services/api';

// Mock the api
vi.mock('../../services/api');

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: () => <div data-testid="radar" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />
}));

const mockESGDashboardData = {
  symbol: 'TEST',
  companyName: 'Test Company',
  lastUpdated: '2023-12-01T00:00:00.000Z',
  currentScores: {
    environmental: 85,
    social: 78,
    governance: 82,
    total: 82,
    grade: 'AA'
  },
  riskAssessment: {
    totalRiskScore: 25,
    riskLevel: 'LOW' as const,
    keyRisks: ['低い再生可能エネルギー比率', '取締役独立性が低い'],
    mitigationStrategies: '現在のESG取り組みを維持し、定期的なモニタリングを継続'
  },
  trend: [
    { year: 2023, totalScore: 82, grade: 'AA' },
    { year: 2022, totalScore: 78, grade: 'A' },
    { year: 2021, totalScore: 75, grade: 'A' }
  ],
  keyMetrics: {
    carbonIntensity: 25,
    renewableEnergyRatio: 65,
    employeeSatisfaction: 75,
    boardIndependence: 75,
    diversityScore: 60
  },
  recommendations: '環境対策の改善が必要、社会的取り組みの強化が必要、ガバナンス体制が良好'
};

describe('ESGDashboard', () => {
  const mockApi = api as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ESGDashboard symbol="TEST" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render ESG dashboard with data', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Check company info
    expect(screen.getByText('Test Company (TEST)')).toBeInTheDocument();
    expect(screen.getByText(/最終更新: 2023/)).toBeInTheDocument();

    // Check scores
    expect(screen.getByText('85')).toBeInTheDocument(); // Environmental score
    expect(screen.getByText('78')).toBeInTheDocument(); // Social score
    expect(screen.getByText('82')).toBeInTheDocument(); // Governance score and total score
    expect(screen.getByText('AA')).toBeInTheDocument(); // Grade

    // Check score labels
    expect(screen.getByText('環境スコア')).toBeInTheDocument();
    expect(screen.getByText('社会スコア')).toBeInTheDocument();
    expect(screen.getByText('ガバナンススコア')).toBeInTheDocument();
    expect(screen.getByText('総合スコア')).toBeInTheDocument();
  });

  it('should render error state when API fails', async () => {
    mockApi.get.mockRejectedValue(new Error('API Error'));

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESGダッシュボードの取得に失敗しました')).toBeInTheDocument();
    });
  });

  it('should render not found state when no data', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: false,
        error: 'ESGデータが見つかりません'
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESGデータが見つかりません')).toBeInTheDocument();
    });
  });

  it('should switch between tabs correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Check initial tab (概要)
    expect(screen.getByText('ESGスコア分布')).toBeInTheDocument();
    expect(screen.getByText('改善提案')).toBeInTheDocument();

    // Click on リスク分析 tab
    const riskTab = screen.getByText('リスク分析');
    fireEvent.click(riskTab);

    expect(screen.getByText('リスクレベル')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('主要リスク要因')).toBeInTheDocument();
    expect(screen.getByText('リスク軽減戦略')).toBeInTheDocument();

    // Click on トレンド tab
    const trendTab = screen.getByText('トレンド');
    fireEvent.click(trendTab);

    expect(screen.getByText('ESGスコアの推移')).toBeInTheDocument();
    expect(screen.getByText('年次ESG評価')).toBeInTheDocument();

    // Click on キーメトリクス tab
    const metricsTab = screen.getByText('キーメトリクス');
    fireEvent.click(metricsTab);

    expect(screen.getByText('主要ESG指標')).toBeInTheDocument();
    expect(screen.getByText('炭素集約度')).toBeInTheDocument();
    expect(screen.getByText('再生可能エネルギー比率')).toBeInTheDocument();
  });

  it('should display risk assessment correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Switch to risk analysis tab
    const riskTab = screen.getByText('リスク分析');
    fireEvent.click(riskTab);

    // Check risk level
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('総合リスクスコア: 25')).toBeInTheDocument();

    // Check risk factors
    expect(screen.getByText('低い再生可能エネルギー比率')).toBeInTheDocument();
    expect(screen.getByText('取締役独立性が低い')).toBeInTheDocument();

    // Check mitigation strategies
    expect(screen.getByText('現在のESG取り組みを維持し、定期的なモニタリングを継続')).toBeInTheDocument();
  });

  it('should display trend analysis correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Switch to trend tab
    const trendTab = screen.getByText('トレンド');
    fireEvent.click(trendTab);

    // Check trend chart
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Check trend table
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('2022')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
  });

  it('should display key metrics correctly', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Switch to metrics tab
    const metricsTab = screen.getByText('キーメトリクス');
    fireEvent.click(metricsTab);

    // Check key metrics
    expect(screen.getByText('炭素集約度')).toBeInTheDocument();
    expect(screen.getByText('再生可能エネルギー比率')).toBeInTheDocument();
    expect(screen.getByText('従業員満足度')).toBeInTheDocument();
    expect(screen.getByText('取締役独立性')).toBeInTheDocument();
    expect(screen.getByText('ダイバーシティスコア')).toBeInTheDocument();

    // Check metric values
    expect(screen.getByText('25')).toBeInTheDocument(); // carbonIntensity
    expect(screen.getByText('65')).toBeInTheDocument(); // renewableEnergyRatio
    expect(screen.getByText('75')).toBeInTheDocument(); // employeeSatisfaction, boardIndependence
    expect(screen.getByText('60')).toBeInTheDocument(); // diversityScore
  });

  it('should call API with correct symbol', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    render(<ESGDashboard symbol="AAPL" />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/esg/AAPL/dashboard');
    });
  });

  it('should update when symbol changes', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: mockESGDashboardData
      }
    });

    const { rerender } = render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/esg/TEST/dashboard');
    });

    // Change symbol
    rerender(<ESGDashboard symbol="AAPL" />);

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/esg/AAPL/dashboard');
    });

    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  it('should handle missing key metrics', async () => {
    const dataWithMissingMetrics = {
      ...mockESGDashboardData,
      keyMetrics: {
        carbonIntensity: 25,
        // Missing other metrics
      }
    };

    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: dataWithMissingMetrics
      }
    });

    render(<ESGDashboard symbol="TEST" />);

    await waitFor(() => {
      expect(screen.getByText('ESG評価ダッシュボード')).toBeInTheDocument();
    });

    // Switch to metrics tab
    const metricsTab = screen.getByText('キーメトリクス');
    fireEvent.click(metricsTab);

    // Should only show available metrics
    expect(screen.getByText('炭素集約度')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();

    // Should not show missing metrics
    expect(screen.queryByText('再生可能エネルギー比率')).not.toBeInTheDocument();
  });
});
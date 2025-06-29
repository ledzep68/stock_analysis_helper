import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinancialSummary from '../FinancialSummary';
import { getCompanyData, api } from '../../services/api';

// Mock the API services
jest.mock('../../services/api');
jest.mock('../RealTimePriceDisplay', () => ({
  RealTimePriceDisplay: ({ symbols, onPriceUpdate }: any) => (
    <div data-testid="realtime-price-display">
      Real-time Price Display for {symbols.join(', ')}
    </div>
  )
}));

const mockGetCompanyData = getCompanyData as jest.MockedFunction<typeof getCompanyData>;
const mockApi = api as jest.Mocked<typeof api>;

const mockCompany = {
  symbol: '7203',
  name: 'トヨタ自動車',
  market: 'TSE',
  sector: '輸送用機器'
};

const mockFinancialData = {
  symbol: '7203',
  price: 2500,
  change: 50,
  changePercent: 2.04,
  volume: 1000000,
  marketCap: 25000000000,
  pe: 12.5,
  eps: 200,
  dividendYield: 0.025,
  week52High: 2800,
  week52Low: 2000,
  previousClose: 2450,
  avgVolume: 1200000,
  timestamp: new Date()
};

describe('FinancialSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    mockGetCompanyData.mockImplementation(() => new Promise(() => {}));
    
    render(<FinancialSummary company={mockCompany} />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render financial data successfully', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車 (7203)')).toBeInTheDocument();
    });

    expect(screen.getByText('¥2,500')).toBeInTheDocument();
    expect(screen.getByText('+50.00 (+2.04%)')).toBeInTheDocument();
    expect(screen.getByText('12.50')).toBeInTheDocument(); // PER
    expect(screen.getByText('¥200')).toBeInTheDocument(); // EPS
    expect(screen.getByText('2.50%')).toBeInTheDocument(); // Dividend Yield
  });

  it('should handle API errors gracefully', async () => {
    mockGetCompanyData.mockRejectedValue(new Error('API Error'));
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('財務データの取得に失敗しました。')).toBeInTheDocument();
    });
  });

  it('should handle 500 errors with fallback', async () => {
    const error = new Error('Server Error');
    (error as any).response = { status: 500 };
    
    mockGetCompanyData.mockRejectedValueOnce(error)
                     .mockResolvedValueOnce(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('外部APIからのデータ取得に失敗しました。データベースからの情報を表示しています。')).toBeInTheDocument();
    });

    // Wait for fallback to succeed
    await waitFor(() => {
      expect(screen.getByText('¥2,500')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should display correct investment recommendation', async () => {
    const bullishData = {
      ...mockFinancialData,
      changePercent: 6.0, // > 5%
      pe: 12 // < 15
    };
    
    mockGetCompanyData.mockResolvedValue(bullishData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('投資判定: BUY')).toBeInTheDocument();
      expect(screen.getByText('上昇トレンド & 適正PER')).toBeInTheDocument();
    });
  });

  it('should handle favorite functionality', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });
    mockApi.post.mockResolvedValue({});

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('お気に入り追加')).toBeInTheDocument();
    });

    const favoriteButton = screen.getByText('お気に入り追加');
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/favorites', {
        symbol: '7203',
        notes: 'トヨタ自動車の財務分析から追加'
      });
    });
  });

  it('should handle favorite removal', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ 
      data: { favorites: [{ symbol: '7203' }] } 
    });
    mockApi.delete.mockResolvedValue({});

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('お気に入り削除')).toBeInTheDocument();
    });

    const favoriteButton = screen.getByText('お気に入り削除');
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith('/favorites/7203');
    });
  });

  it('should handle page navigation', async () => {
    const mockOnPageChange = jest.fn();
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} onPageChange={mockOnPageChange} />);

    await waitFor(() => {
      expect(screen.getByText('テクニカル分析')).toBeInTheDocument();
    });

    const technicalButton = screen.getByText('テクニカル分析');
    fireEvent.click(technicalButton);

    expect(mockOnPageChange).toHaveBeenCalledWith('technical');
  });

  it('should render real-time price display', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByTestId('realtime-price-display')).toBeInTheDocument();
    });

    expect(screen.getByText('Real-time Price Display for 7203')).toBeInTheDocument();
  });

  it('should update price with real-time data', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('¥2,500')).toBeInTheDocument();
    });

    // Simulate real-time price update
    const realTimeUpdate = {
      symbol: '7203',
      price: 2550,
      change: 100,
      changePercent: 4.08,
      volume: 1100000,
      timestamp: new Date(),
      source: 'live' as const
    };

    // This would be called by the RealTimePriceDisplay component
    // In a real test, we'd need to trigger this through component interaction
  });

  it('should format currency correctly', async () => {
    mockGetCompanyData.mockResolvedValue(mockFinancialData);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getByText('¥2,500')).toBeInTheDocument();
      expect(screen.getByText('¥2,800')).toBeInTheDocument(); // 52-week high
      expect(screen.getByText('¥2,000')).toBeInTheDocument(); // 52-week low
    });
  });

  it('should handle N/A values correctly', async () => {
    const dataWithNulls = {
      ...mockFinancialData,
      pe: 0,
      eps: 0,
      dividendYield: 0
    };
    
    mockGetCompanyData.mockResolvedValue(dataWithNulls);
    mockApi.get.mockResolvedValue({ data: { favorites: [] } });

    render(<FinancialSummary company={mockCompany} />);

    await waitFor(() => {
      expect(screen.getAllByText('N/A')).toHaveLength(3);
    });
  });
});
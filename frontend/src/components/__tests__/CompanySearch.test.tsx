import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompanySearch from '../CompanySearch';

// Mock the API
jest.mock('../../services/api', () => ({
  searchCompanies: jest.fn()
}));

import { searchCompanies } from '../../services/api';

const mockSearchCompanies = searchCompanies as jest.MockedFunction<typeof searchCompanies>;

const mockCompanies = [
  {
    symbol: '7203',
    name: 'トヨタ自動車株式会社',
    market: 'TSE',
    sector: '輸送用機器',
    description: '自動車メーカー'
  },
  {
    symbol: '9984',
    name: 'ソフトバンクグループ株式会社',
    market: 'TSE',
    sector: '情報・通信業',
    description: '投資持株会社'
  }
];

describe('CompanySearch Component', () => {
  const mockOnCompanySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search form', () => {
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    expect(screen.getByText('企業検索')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('企業名または銘柄コードを入力してください')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '検索' })).toBeInTheDocument();
  });

  it('performs search when user types and clicks search button', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'トヨタ');
    await user.click(searchButton);
    
    expect(mockSearchCompanies).toHaveBeenCalledWith('トヨタ');
  });

  it('displays search results', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'トヨタ');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車株式会社')).toBeInTheDocument();
      expect(screen.getByText('7203')).toBeInTheDocument();
      expect(screen.getByText('輸送用機器')).toBeInTheDocument();
    });
  });

  it('calls onCompanySelect when company card is clicked', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'トヨタ');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車株式会社')).toBeInTheDocument();
    });
    
    const companyCard = screen.getByText('トヨタ自動車株式会社').closest('.MuiCard-root');
    expect(companyCard).toBeInTheDocument();
    
    if (companyCard) {
      await user.click(companyCard);
      expect(mockOnCompanySelect).toHaveBeenCalledWith(mockCompanies[0]);
    }
  });

  it('displays loading state during search', async () => {
    const user = userEvent.setup();
    let resolveSearch: (value: any[]) => void;
    const searchPromise = new Promise<any[]>((resolve) => {
      resolveSearch = resolve;
    });
    mockSearchCompanies.mockReturnValue(searchPromise);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'トヨタ');
    await user.click(searchButton);
    
    expect(screen.getByTestId('search-loading')).toBeInTheDocument();
    
    resolveSearch!(mockCompanies);
    
    await waitFor(() => {
      expect(screen.queryByTestId('search-loading')).not.toBeInTheDocument();
    });
  });

  it('displays error message on search failure', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockRejectedValue(new Error('Search failed'));
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'トヨタ');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('検索に失敗しました。もう一度お試しください。')).toBeInTheDocument();
    });
  });

  it('displays no results message when search returns empty array', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockResolvedValue([]);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    const searchButton = screen.getByRole('button', { name: '検索' });
    
    await user.type(searchInput, 'nonexistent');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('検索結果が見つかりませんでした。')).toBeInTheDocument();
    });
  });

  it('prevents search with empty query', async () => {
    const user = userEvent.setup();
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchButton = screen.getByRole('button', { name: '検索' });
    await user.click(searchButton);
    
    expect(mockSearchCompanies).not.toHaveBeenCalled();
  });

  it('performs search on Enter key press', async () => {
    const user = userEvent.setup();
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードを入力してください');
    
    await user.type(searchInput, 'トヨタ');
    await user.keyboard('{Enter}');
    
    expect(mockSearchCompanies).toHaveBeenCalledWith('トヨタ');
  });
});
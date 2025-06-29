import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompanySearch from '../CompanySearch';
import { searchCompanies } from '../../services/api';

// Mock the API
jest.mock('../../services/api');

const mockSearchCompanies = searchCompanies as jest.MockedFunction<typeof searchCompanies>;

const mockCompanies = [
  {
    symbol: '7203',
    name: 'トヨタ自動車',
    market: 'TSE',
    sector: '輸送用機器'
  },
  {
    symbol: '7201',
    name: '日産自動車',
    market: 'TSE',
    sector: '輸送用機器'
  }
];

describe('CompanySearch', () => {
  const mockOnCompanySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input', () => {
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    expect(screen.getByPlaceholderText('企業名または銘柄コードで検索')).toBeInTheDocument();
  });

  it('should perform search when typing', async () => {
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });

    await waitFor(() => {
      expect(mockSearchCompanies).toHaveBeenCalledWith('トヨタ');
    });

    expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    expect(screen.getByText('7203')).toBeInTheDocument();
  });

  it('should handle company selection', async () => {
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });

    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('トヨタ自動車'));

    expect(mockOnCompanySelect).toHaveBeenCalledWith(mockCompanies[0]);
  });

  it('should show loading state during search', async () => {
    mockSearchCompanies.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockCompanies), 100)));
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    });
  });

  it('should handle search errors', async () => {
    mockSearchCompanies.mockRejectedValue(new Error('Search failed'));
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });

    await waitFor(() => {
      expect(screen.getByText('検索中にエラーが発生しました')).toBeInTheDocument();
    });
  });

  it('should clear results when search is cleared', async () => {
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    
    // Search
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });
    await waitFor(() => {
      expect(screen.getByText('トヨタ自動車')).toBeInTheDocument();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    expect(screen.queryByText('トヨタ自動車')).not.toBeInTheDocument();
  });

  it('should show no results message', async () => {
    mockSearchCompanies.mockResolvedValue([]);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('検索結果が見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('should debounce search input', async () => {
    mockSearchCompanies.mockResolvedValue(mockCompanies);
    
    render(<CompanySearch onCompanySelect={mockOnCompanySelect} />);
    
    const searchInput = screen.getByPlaceholderText('企業名または銘柄コードで検索');
    
    // Type quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'to' } });
    fireEvent.change(searchInput, { target: { value: 'toy' } });
    fireEvent.change(searchInput, { target: { value: 'トヨタ' } });

    // Should only call search once after debounce
    await waitFor(() => {
      expect(mockSearchCompanies).toHaveBeenCalledTimes(1);
      expect(mockSearchCompanies).toHaveBeenCalledWith('トヨタ');
    });
  });
});
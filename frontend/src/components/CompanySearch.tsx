import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { Company } from '../types';
import { searchCompanies } from '../services/api';
import { validateSearchInput, getSafeErrorMessage } from '../utils/security';

interface CompanySearchProps {
  onCompanySelect: (company: Company) => void;
}

const CompanySearch: React.FC<CompanySearchProps> = ({ onCompanySelect }) => {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState<string>('');

  const handleSearch = async () => {
    if (!query.trim()) return;

    // 入力値の安全性チェック
    if (!validateSearchInput(query)) {
      setError('検索キーワードに無効な文字が含まれています。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchCompanies(query);
      // 市場区分フィルターを適用
      const filteredResults = marketFilter 
        ? results.filter(company => company.marketSegment === marketFilter)
        : results;
      setCompanies(filteredResults);
    } catch (err) {
      setError(getSafeErrorMessage(err));
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3, textAlign: 'center' }}>
        企業検索
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="企業名または銘柄コードを入力してください"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>市場区分</InputLabel>
          <Select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value)}
            label="市場区分"
            disabled={loading}
          >
            <MenuItem value="">すべて</MenuItem>
            <MenuItem value="Prime">プライム市場</MenuItem>
            <MenuItem value="Standard">スタンダード市場</MenuItem>
            <MenuItem value="Growth">グロース市場</MenuItem>
            <MenuItem value="NASDAQ">NASDAQ</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : <Search />}
          data-testid="search-loading"
        >
          検索
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {companies.length > 0 && (
        <Paper elevation={1}>
          <List>
            {companies.map((company) => (
              <ListItem
                key={company.symbol}
                component="div"
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => onCompanySelect(company)}
                data-testid="company-card"
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ListItemText
                      primary={`${company.name} (${company.symbol})`}
                      secondary={`${company.industry} | ${company.sector}`}
                    />
                    {company.marketSegment && (
                      <Chip 
                        label={
                          company.marketSegment === 'Prime' ? 'プライム' :
                          company.marketSegment === 'Standard' ? 'スタンダード' :
                          company.marketSegment === 'Growth' ? 'グロース' :
                          company.marketSegment
                        }
                        size="small"
                        color={
                          company.marketSegment === 'Prime' ? 'primary' :
                          company.marketSegment === 'Standard' ? 'secondary' :
                          company.marketSegment === 'Growth' ? 'success' :
                          'default'
                        }
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {!loading && companies.length === 0 && query && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', mt: 2 }}
        >
          検索結果が見つかりませんでした。
        </Typography>
      )}
    </Box>
  );
};

export default CompanySearch;
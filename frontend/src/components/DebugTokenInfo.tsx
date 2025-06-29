import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { debugToken, decodeToken, getTokenRemainingTime } from '../utils/tokenUtils';

export const DebugTokenInfo: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  const refreshTokenInfo = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeToken(token);
      const remainingTime = getTokenRemainingTime(token);
      
      setTokenInfo({
        payload,
        remainingTime,
        expiresAt: payload?.exp ? new Date(payload.exp * 1000) : null,
        issuedAt: payload?.iat ? new Date(payload.iat * 1000) : null
      });
      
      // Also log to console
      debugToken(token);
    } else {
      setTokenInfo(null);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getStatusColor = (remainingTime: number) => {
    if (remainingTime > 3600) return 'success'; // > 1 hour
    if (remainingTime > 1800) return 'warning'; // > 30 minutes
    return 'error'; // < 30 minutes
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 9999 }}>
      <Accordion 
        expanded={expanded} 
        onChange={() => setExpanded(!expanded)}
        sx={{ minWidth: 300, maxWidth: 400 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <SecurityIcon color="primary" />
            <Typography variant="subtitle2">Token Debug</Typography>
            {tokenInfo && (
              <Chip 
                label={formatTime(tokenInfo.remainingTime)} 
                size="small" 
                color={getStatusColor(tokenInfo.remainingTime)}
              />
            )}
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Box>
            <Button
              startIcon={<RefreshIcon />}
              onClick={refreshTokenInfo}
              size="small"
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
            >
              Refresh Token Info
            </Button>

            {!tokenInfo && (
              <Alert severity="warning">
                No token found in localStorage
              </Alert>
            )}

            {tokenInfo && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  User ID: {tokenInfo.payload?.userId}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Email: {tokenInfo.payload?.email}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Issued: {tokenInfo.issuedAt?.toLocaleString()}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Expires: {tokenInfo.expiresAt?.toLocaleString()}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Remaining: {formatTime(tokenInfo.remainingTime)}
                </Typography>
                
                {tokenInfo.remainingTime < 1800 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Token expires soon!
                  </Alert>
                )}
                
                {tokenInfo.remainingTime <= 0 && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Token has expired!
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
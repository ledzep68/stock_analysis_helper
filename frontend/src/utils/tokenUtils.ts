export interface TokenPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as TokenPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

export const isTokenValid = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload) {
    return false;
  }

  const now = Date.now() / 1000;
  
  // Check expiration
  if (payload.exp && payload.exp < now) {
    console.log('Token has expired');
    return false;
  }

  // Check issuer
  if (payload.iss !== 'stock-analysis-helper') {
    console.log('Invalid token issuer');
    return false;
  }

  // Check audience
  if (payload.aud !== 'stock-analysis-users') {
    console.log('Invalid token audience');
    return false;
  }

  return true;
};

export const getTokenExpirationTime = (token: string): Date | null => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  return new Date(payload.exp * 1000);
};

export const getTokenRemainingTime = (token: string): number => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return 0;
  }
  
  const now = Date.now() / 1000;
  return Math.max(0, payload.exp - now);
};

export const shouldRefreshToken = (token: string): boolean => {
  const remainingTime = getTokenRemainingTime(token);
  // Refresh if less than 1 hour remaining
  return remainingTime < 3600;
};

export const debugToken = (token: string): void => {
  console.group('🔐 Token Debug Info');
  
  const payload = decodeToken(token);
  if (!payload) {
    console.error('❌ Invalid token format');
    console.groupEnd();
    return;
  }

  const now = new Date();
  const issuedAt = new Date(payload.iat * 1000);
  const expiresAt = new Date(payload.exp * 1000);
  const remainingTime = getTokenRemainingTime(token);

  console.log('📋 Token Payload:', payload);
  console.log('⏰ Current Time:', now.toISOString());
  console.log('🎫 Issued At:', issuedAt.toISOString());
  console.log('⏳ Expires At:', expiresAt.toISOString());
  console.log('⏱️ Remaining Time:', `${Math.floor(remainingTime / 3600)}h ${Math.floor((remainingTime % 3600) / 60)}m`);
  console.log('✅ Is Valid:', isTokenValid(token));
  console.log('🔄 Should Refresh:', shouldRefreshToken(token));
  
  console.groupEnd();
};
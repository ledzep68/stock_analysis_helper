import axios from 'axios';
import { Company, FinancialData, ApiResponse } from '../types';
import { isTokenValid, debugToken } from '../utils/tokenUtils';

// プロキシが動作しない場合の直接アクセス
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5555/api' 
  : '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to all requests if available
apiClient.interceptors.request.use((config) => {
  console.log(`🚀 Making API request to: ${config.baseURL}${config.url}`);
  
  // 開発環境での一時的な認証スキップ
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode - bypassing auth token requirement');
    return config;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    if (isTokenValid(token)) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Added valid auth token to request`);
    } else {
      console.log(`🚫 Token is invalid/expired, removing from storage`);
      localStorage.removeItem('token');
      // Redirect to login instead of continuing with invalid token
      window.location.reload();
      return Promise.reject(new Error('Token expired'));
    }
  } else {
    console.log(`⚠️ No auth token found`);
  }
  return config;
});

// Handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('🚨 API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });

    if (error.response?.status === 401) {
      console.log('🔒 401 Unauthorized - removing token and reloading');
      localStorage.removeItem('token');
      window.location.reload();
    } else if (error.response?.status === 403) {
      console.log('🚫 403 Forbidden - token may be expired or invalid');
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const login = async (email: string, password: string): Promise<string> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success && response.data.data?.token) {
      const token = response.data.data.token;
      
      // Debug token information
      console.log('🎫 Login successful, token received');
      debugToken(token);
      
      return token;
    }
    
    throw new Error(response.data.error || 'Login failed');
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};

export const logout = (): void => {
  localStorage.removeItem('token');
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }
  
  const valid = isTokenValid(token);
  if (!valid) {
    localStorage.removeItem('token');
  }
  
  return valid;
};

export const searchCompanies = async (query: string): Promise<Company[]> => {
  try {
    console.log(`🔍 Searching companies for: "${query}"`);
    console.log(`📡 API Base URL: ${API_BASE_URL}`);
    
    const response = await apiClient.get<ApiResponse<Company[]>>('/companies/search', {
      params: { q: query }
    });
    
    console.log(`✅ Search response:`, response.data);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to search companies');
  } catch (error: any) {
    console.error('❌ Error searching companies:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url
    });
    throw error;
  }
};

export const getCompanyData = async (symbol: string): Promise<FinancialData> => {
  try {
    const response = await apiClient.get<ApiResponse<FinancialData>>(`/companies/${symbol}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get company data');
  } catch (error) {
    console.error('Error getting company data:', error);
    throw error;
  }
};

// Notification API functions
export const subscribeToNotifications = async (subscription: PushSubscription): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.post('/notifications/subscribe', {
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to subscribe to notifications');
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    throw error;
  }
};

export const unsubscribeFromNotifications = async (endpoint: string): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.post('/notifications/unsubscribe', {
      endpoint
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unsubscribe from notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    throw error;
  }
};

export const getNotificationPreferences = async (): Promise<any> => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.get('/notifications/preferences', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get notification preferences');
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    throw error;
  }
};

export const updateNotificationPreferences = async (preferences: any): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.put('/notifications/preferences', {
      preferences
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update notification preferences');
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

export const sendTestNotification = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiClient.post('/notifications/test', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send test notification');
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

// Utility function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const api = {
  get: (url: string, config?: any) => {
    return apiClient.get(url, config);
  },
  post: (url: string, data: any, config?: any) => {
    return apiClient.post(url, data, config);
  },
  put: (url: string, data: any, config?: any) => {
    return apiClient.put(url, data, config);
  },
  delete: (url: string, config?: any) => {
    return apiClient.delete(url, config);
  }
};

export { api };
export default api;
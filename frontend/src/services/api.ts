import axios from 'axios';
import { Company, FinancialData, ApiResponse } from '../types';

// 一時的にハードコード - 絶対にポート5001を使用
const API_BASE_URL = 'http://localhost:5003/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to all requests if available
apiClient.interceptors.request.use((config) => {
  console.log(`🚀 Making API request to: ${config.baseURL}${config.url}`);
  console.log(`📋 Request config:`, {
    method: config.method,
    url: config.url,
    params: config.params,
    headers: config.headers
  });
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`🔑 Added auth token to request`);
  } else {
    console.log(`⚠️ No auth token found`);
  }
  return config;
});

// Handle authentication errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Optionally redirect to login
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
      return response.data.data.token;
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
  return !!localStorage.getItem('token');
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

export const api = {
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
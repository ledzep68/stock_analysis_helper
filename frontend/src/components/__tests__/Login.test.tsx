import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from '../Login';

// Mock the API
jest.mock('../../services/api', () => ({
  login: jest.fn()
}));

import { login } from '../../services/api';

const mockLogin = login as jest.MockedFunction<typeof login>;

describe('Login Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form with all elements', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    expect(screen.getByText('株式分析ヘルパー')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('displays test credentials by default', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByLabelText('メールアドレス') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement;
    
    expect(emailInput.value).toBe('testuser@example.com');
    expect(passwordInput.value).toBe('TestPassword123@');
  });

  it('allows user to change email and password', async () => {
    const user = userEvent.setup();
    render(<Login onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    
    await user.clear(emailInput);
    await user.type(emailInput, 'newuser@example.com');
    
    await user.clear(passwordInput);
    await user.type(passwordInput, 'newpassword');
    
    expect(emailInput).toHaveValue('newuser@example.com');
    expect(passwordInput).toHaveValue('newpassword');
  });

  it('calls login API on form submission', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue('mock-token');
    
    render(<Login onLogin={mockOnLogin} />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    await user.click(loginButton);
    
    expect(mockLogin).toHaveBeenCalledWith('testuser@example.com', 'TestPassword123@');
  });

  it('calls onLogin callback on successful login', async () => {
    const user = userEvent.setup();
    const mockToken = 'mock-jwt-token';
    mockLogin.mockResolvedValue(mockToken);
    
    render(<Login onLogin={mockOnLogin} />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith(mockToken);
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    
    render(<Login onLogin={mockOnLogin} />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    await user.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('ログインに失敗しました。メールアドレスとパスワードを確認してください。')).toBeInTheDocument();
    });
    
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    let resolveLogin: (value: string) => void;
    const loginPromise = new Promise<string>((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);
    
    render(<Login onLogin={mockOnLogin} />);
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    await user.click(loginButton);
    
    expect(loginButton).toBeDisabled();
    expect(screen.getByTestId('login-loading')).toBeInTheDocument();
    
    resolveLogin!('token');
    
    await waitFor(() => {
      expect(loginButton).not.toBeDisabled();
    });
  });

  it('prevents form submission with empty email', async () => {
    const user = userEvent.setup();
    render(<Login onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    await user.clear(emailInput);
    await user.click(loginButton);
    
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('prevents form submission with empty password', async () => {
    const user = userEvent.setup();
    render(<Login onLogin={mockOnLogin} />);
    
    const passwordInput = screen.getByLabelText('パスワード');
    const loginButton = screen.getByRole('button', { name: 'ログイン' });
    
    await user.clear(passwordInput);
    await user.click(loginButton);
    
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
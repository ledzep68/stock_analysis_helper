import { createTheme, ThemeOptions } from '@mui/material/styles';

// モバイルファーストのブレークポイント定義
const breakpoints = {
  values: {
    xs: 0,      // モバイル（縦）
    sm: 576,    // モバイル（横）  
    md: 768,    // タブレット
    lg: 992,    // デスクトップ（小）
    xl: 1200,   // デスクトップ（大）
  },
};

// モバイル最適化されたタイポグラフィ
const typography = {
  // モバイルでの読みやすさを重視
  h1: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.2,
    '@media (min-width:768px)': {
      fontSize: '2.5rem',
    },
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
    '@media (min-width:768px)': {
      fontSize: '2rem',
    },
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
    '@media (min-width:768px)': {
      fontSize: '1.5rem',
    },
  },
  h4: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
    '@media (min-width:768px)': {
      fontSize: '1.25rem',
    },
  },
  h5: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
    '@media (min-width:768px)': {
      fontSize: '1.125rem',
    },
  },
  h6: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    '@media (min-width:768px)': {
      fontSize: '1rem',
    },
  },
  body1: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    '@media (min-width:768px)': {
      fontSize: '1rem',
    },
  },
  body2: {
    fontSize: '0.75rem',
    lineHeight: 1.5,
    '@media (min-width:768px)': {
      fontSize: '0.875rem',
    },
  },
  caption: {
    fontSize: '0.6875rem',
    lineHeight: 1.4,
    '@media (min-width:768px)': {
      fontSize: '0.75rem',
    },
  },
};

// モバイル用コンポーネント設定
const components = {
  // ボタンのタッチ最適化
  MuiButton: {
    styleOverrides: {
      root: {
        minHeight: 44, // タッチターゲットサイズ（iOS HIG準拠）
        borderRadius: 8,
        textTransform: 'none' as const,
        fontWeight: 600,
        padding: '12px 24px',
        '@media (max-width:767px)': {
          minHeight: 48, // モバイルでより大きく
          padding: '14px 28px',
        },
      },
      contained: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        },
      },
    },
  },
  
  // カードのモバイル最適化
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        '@media (max-width:767px)': {
          borderRadius: 8,
          margin: '8px',
        },
      },
    },
  },

  // テキストフィールドのタッチ最適化
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-root': {
          minHeight: 44,
          '@media (max-width:767px)': {
            minHeight: 48,
          },
        },
        '& .MuiInputBase-input': {
          padding: '12px 16px',
          '@media (max-width:767px)': {
            padding: '14px 16px',
            fontSize: '16px', // iOS zoomを防ぐ
          },
        },
      },
    },
  },

  // アイコンボタンのタッチ最適化
  MuiIconButton: {
    styleOverrides: {
      root: {
        minWidth: 44,
        minHeight: 44,
        '@media (max-width:767px)': {
          minWidth: 48,
          minHeight: 48,
        },
      },
    },
  },

  // チップのモバイル最適化
  MuiChip: {
    styleOverrides: {
      root: {
        height: 32,
        borderRadius: 16,
        '@media (max-width:767px)': {
          height: 36,
          borderRadius: 18,
        },
      },
    },
  },

  // タブのモバイル最適化
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 48,
        minWidth: 'auto',
        padding: '12px 16px',
        '@media (max-width:767px)': {
          minHeight: 56,
          padding: '16px 12px',
          fontSize: '0.875rem',
        },
      },
    },
  },

  // テーブルのモバイル最適化
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '12px 16px',
        '@media (max-width:767px)': {
          padding: '8px 12px',
          fontSize: '0.75rem',
        },
      },
      head: {
        fontWeight: 600,
        backgroundColor: 'rgba(0,0,0,0.04)',
      },
    },
  },

  // ダイアログのモバイル最適化
  MuiDialog: {
    styleOverrides: {
      paper: {
        margin: 16,
        maxHeight: 'calc(100vh - 32px)',
        '@media (max-width:767px)': {
          margin: 8,
          maxHeight: 'calc(100vh - 16px)',
          borderRadius: 12,
        },
      },
    },
  },

  // スナックバーのモバイル最適化
  MuiSnackbar: {
    styleOverrides: {
      root: {
        '@media (max-width:767px)': {
          bottom: 90, // ボトムナビゲーションの上に表示
        },
      },
    },
  },
};

// ライトテーマ
export const lightTheme = createTheme({
  breakpoints,
  typography,
  components,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
} as ThemeOptions);

// ダークテーマ
export const darkTheme = createTheme({
  breakpoints,
  typography,
  components: {
    ...components,
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1e1e1e',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          '@media (max-width:767px)': {
            borderRadius: 8,
            margin: '8px',
          },
        },
      },
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    success: {
      main: '#66bb6a',
      light: '#a5d6a7',
      dark: '#4caf50',
    },
    error: {
      main: '#ef5350',
      light: '#ffcdd2',
      dark: '#c62828',
    },
    warning: {
      main: '#ffa726',
      light: '#ffcc02',
      dark: '#ef6c00',
    },
    info: {
      main: '#29b6f6',
      light: '#81d4fa',
      dark: '#0277bd',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
} as ThemeOptions);
/**
 * テスト環境設定
 * 開発・テスト・本番環境の分離
 */

export interface TestEnvironmentConfig {
  environment: 'development' | 'test' | 'production';
  useMockApis: boolean;
  enableRealApiCalls: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  testingFeatures: {
    simulateApiFailures: boolean;
    simulateNetworkDelay: boolean;
    enableDetailedLogging: boolean;
    recordAllApiCalls: boolean;
  };
  apiSettings: {
    yahooFinance: {
      enabled: boolean;
      mock: boolean;
      baseUrl?: string;
      timeout: number;
    };
    alphaVantage: {
      enabled: boolean;
      mock: boolean;
      apiKey?: string;
      timeout: number;
    };
    iexCloud: {
      enabled: boolean;
      mock: boolean;
      apiKey?: string;
      timeout: number;
    };
    polygon: {
      enabled: boolean;
      mock: boolean;
      apiKey?: string;
      timeout: number;
    };
  };
  rateLimits: {
    enforceInTest: boolean;
    resetOnTestStart: boolean;
  };
}

class TestEnvironmentManager {
  private config: TestEnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): TestEnvironmentConfig {
    const env = process.env.NODE_ENV as 'development' | 'test' | 'production' || 'development';
    
    // 基本設定
    const baseConfig: TestEnvironmentConfig = {
      environment: env,
      useMockApis: env === 'test' || env === 'development',
      enableRealApiCalls: env === 'production',
      logLevel: env === 'production' ? 'warn' : 'debug',
      testingFeatures: {
        simulateApiFailures: env === 'test',
        simulateNetworkDelay: env === 'test',
        enableDetailedLogging: env !== 'production',
        recordAllApiCalls: env !== 'production'
      },
      apiSettings: {
        yahooFinance: {
          enabled: true,
          mock: env !== 'production',
          baseUrl: process.env.YAHOO_FINANCE_URL,
          timeout: env === 'test' ? 1000 : 5000
        },
        alphaVantage: {
          enabled: !!process.env.ALPHA_VANTAGE_API_KEY || env === 'test',
          mock: env !== 'production' || !process.env.ALPHA_VANTAGE_API_KEY,
          apiKey: process.env.ALPHA_VANTAGE_API_KEY,
          timeout: env === 'test' ? 1000 : 5000
        },
        iexCloud: {
          enabled: !!process.env.IEX_CLOUD_API_KEY || env === 'test',
          mock: env !== 'production' || !process.env.IEX_CLOUD_API_KEY,
          apiKey: process.env.IEX_CLOUD_API_KEY,
          timeout: env === 'test' ? 1000 : 5000
        },
        polygon: {
          enabled: !!process.env.POLYGON_API_KEY || env === 'test',
          mock: env !== 'production' || !process.env.POLYGON_API_KEY,
          apiKey: process.env.POLYGON_API_KEY,
          timeout: env === 'test' ? 1000 : 5000
        }
      },
      rateLimits: {
        enforceInTest: env === 'test',
        resetOnTestStart: env === 'test'
      }
    };

    // 環境変数による上書き
    if (process.env.FORCE_MOCK_APIS === 'true') {
      baseConfig.useMockApis = true;
      baseConfig.enableRealApiCalls = false;
    }

    if (process.env.ENABLE_REAL_APIS === 'true') {
      baseConfig.enableRealApiCalls = true;
      baseConfig.useMockApis = false;
    }

    // デフォルトで実APIを有効にする（正確な株価データ取得のため）
    if (env === 'development') {
      baseConfig.enableRealApiCalls = true;
      baseConfig.useMockApis = false;
    }

    return baseConfig;
  }

  public getConfig(): TestEnvironmentConfig {
    return { ...this.config };
  }

  public isTestEnvironment(): boolean {
    return this.config.environment === 'test';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public shouldUseMockApis(): boolean {
    return this.config.useMockApis;
  }

  public shouldEnableRealApiCalls(): boolean {
    return this.config.enableRealApiCalls;
  }

  public getApiConfig(provider: keyof TestEnvironmentConfig['apiSettings']) {
    return this.config.apiSettings[provider];
  }

  public shouldSimulateFailures(): boolean {
    return this.config.testingFeatures.simulateApiFailures;
  }

  public shouldSimulateDelay(): boolean {
    return this.config.testingFeatures.simulateNetworkDelay;
  }

  public shouldEnforceRateLimits(): boolean {
    return this.config.rateLimits.enforceInTest;
  }

  public shouldResetRateLimitsOnTestStart(): boolean {
    return this.config.rateLimits.resetOnTestStart;
  }

  public getLogLevel(): string {
    return this.config.logLevel;
  }

  public shouldRecordApiCalls(): boolean {
    return this.config.testingFeatures.recordAllApiCalls;
  }

  /**
   * テスト設定の一時変更
   */
  public temporaryOverride(overrides: Partial<TestEnvironmentConfig>): () => void {
    const originalConfig = { ...this.config };
    this.config = { ...this.config, ...overrides };
    
    return () => {
      this.config = originalConfig;
    };
  }

  /**
   * 安全性チェック
   */
  public validateSafetySettings(): {
    safe: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 本番環境でのモック使用チェック
    if (this.config.environment === 'production' && this.config.useMockApis) {
      warnings.push('Production environment is using mock APIs');
      recommendations.push('Set FORCE_MOCK_APIS=false for production');
    }

    // テスト環境での実API使用チェック
    if (this.config.environment === 'test' && this.config.enableRealApiCalls) {
      warnings.push('Test environment has real API calls enabled');
      recommendations.push('Consider using mock APIs for testing to avoid quota usage');
    }

    // API キーの設定チェック
    Object.entries(this.config.apiSettings).forEach(([provider, settings]) => {
      const hasApiKey = 'apiKey' in settings ? settings.apiKey : true; // Yahoo Financeはベース設定なのでキー不要
      if (settings.enabled && !settings.mock && !hasApiKey && this.config.environment === 'production') {
        warnings.push(`${provider} API key missing in production`);
        recommendations.push(`Set ${provider.toUpperCase()}_API_KEY environment variable`);
      }
    });

    return {
      safe: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * 環境情報の表示
   */
  public displayEnvironmentInfo(): void {
    const safety = this.validateSafetySettings();
    
    console.log(`\\n🌍 Test Environment Configuration`);
    console.log(`   Environment: ${this.config.environment}`);
    console.log(`   Mock APIs: ${this.config.useMockApis ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`   Real APIs: ${this.config.enableRealApiCalls ? '⚠️ Enabled' : '✅ Disabled'}`);
    console.log(`   Log Level: ${this.config.logLevel}`);
    
    console.log(`\\n📡 API Provider Status:`);
    Object.entries(this.config.apiSettings).forEach(([provider, settings]) => {
      const status = settings.enabled ? 
        (settings.mock ? '🔵 Mock' : '🟡 Real') : 
        '⚫ Disabled';
      console.log(`   ${provider}: ${status}`);
    });

    if (!safety.safe) {
      console.log(`\\n⚠️ Safety Warnings:`);
      safety.warnings.forEach(warning => console.log(`   - ${warning}`));
      
      console.log(`\\n💡 Recommendations:`);
      safety.recommendations.forEach(rec => console.log(`   - ${rec}`));
    } else {
      console.log(`\\n✅ Environment configuration is safe`);
    }
    
    console.log(``);
  }
}

export const testEnvironment = new TestEnvironmentManager();
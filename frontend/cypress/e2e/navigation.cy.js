describe('App Navigation', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/');
    cy.get('button').contains('ログイン').click();
    
    // Wait for login to complete
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('should navigate using bottom navigation', () => {
    // Test Home
    cy.get('[data-testid="bottom-nav"] button').contains('ホーム').click();
    cy.contains('株式分析ヘルパー').should('be.visible');
    
    // Test Search
    cy.get('[data-testid="bottom-nav"] button').contains('検索').click();
    cy.contains('企業検索').should('be.visible');
    
    // Test Analysis
    cy.get('[data-testid="bottom-nav"] button').contains('分析').click();
    cy.contains('企業を選択してテクニカル分析を表示').should('be.visible');
    
    // Test Portfolio
    cy.get('[data-testid="bottom-nav"] button').contains('ポートフォリオ').click();
    cy.contains('ポートフォリオ').should('be.visible');
    
    // Test Profile
    cy.get('[data-testid="bottom-nav"] button').contains('プロフィール').click();
    cy.contains('ユーザープロフィール').should('be.visible');
    
    // Test Help
    cy.get('[data-testid="bottom-nav"] button').contains('ヘルプ').click();
    cy.contains('使い方ガイド').should('be.visible');
  });

  it('should navigate using hamburger menu', () => {
    // Open hamburger menu
    cy.get('[data-testid="hamburger-menu"]').click();
    
    // Test menu items
    cy.get('[data-testid="drawer-menu"]').within(() => {
      cy.contains('ホーム').click();
    });
    cy.contains('株式分析ヘルパー').should('be.visible');
    
    // Open menu again and test another item
    cy.get('[data-testid="hamburger-menu"]').click();
    cy.get('[data-testid="drawer-menu"]').within(() => {
      cy.contains('企業検索').click();
    });
    cy.contains('企業検索').should('be.visible');
  });

  it('should navigate using top bar buttons', () => {
    // Test search button in top bar
    cy.get('[data-testid="top-search-button"]').click();
    cy.contains('企業検索').should('be.visible');
    
    // Test notifications button in top bar
    cy.get('[data-testid="top-notifications-button"]').click();
    cy.contains('価格アラート').should('be.visible');
  });

  it('should show offline status when network is down', () => {
    // Simulate offline mode
    cy.window().then((win) => {
      win.navigator.serviceWorker.ready.then(() => {
        // Trigger offline event
        win.dispatchEvent(new Event('offline'));
      });
    });
    
    // Should show offline indicator
    cy.contains('オフライン').should('be.visible');
  });
});
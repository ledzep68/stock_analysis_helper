describe('Company Search', () => {
  beforeEach(() => {
    // Login and navigate to search page
    cy.visit('/');
    cy.get('button').contains('ログイン').click();
    cy.get('[data-testid="bottom-nav"] button').contains('検索').click();
  });

  it('should display search form', () => {
    cy.contains('企業検索').should('be.visible');
    cy.get('input[placeholder*="企業名または銘柄コード"]').should('be.visible');
    cy.get('button').contains('検索').should('be.visible');
  });

  it('should search for companies', () => {
    // Enter search term
    cy.get('input[placeholder*="企業名または銘柄コード"]').type('トヨタ');
    
    // Click search button
    cy.get('button').contains('検索').click();
    
    // Should show loading state
    cy.get('[data-testid="search-loading"]').should('exist');
    
    // Should show results (mock response expected)
    cy.contains('検索結果', { timeout: 10000 }).should('be.visible');
  });

  it('should handle search errors gracefully', () => {
    // Enter invalid search term
    cy.get('input[placeholder*="企業名または銘柄コード"]').type('invalidcompany123');
    
    // Click search button
    cy.get('button').contains('検索').click();
    
    // Should handle error (either no results or error message)
    cy.contains('検索結果が見つかりませんでした', { timeout: 10000 }).should('be.visible');
  });

  it('should prevent search with empty query', () => {
    // Search button should be disabled when input is empty
    cy.get('button').contains('検索').should('be.disabled');
    
    // Type something and button should be enabled
    cy.get('input[placeholder*="企業名または銘柄コード"]').type('test');
    cy.get('button').contains('検索').should('not.be.disabled');
    
    // Clear input and button should be disabled again
    cy.get('input[placeholder*="企業名または銘柄コード"]').clear();
    cy.get('button').contains('検索').should('be.disabled');
  });

  it('should allow search by pressing Enter', () => {
    // Enter search term
    cy.get('input[placeholder*="企業名または銘柄コード"]').type('トヨタ{enter}');
    
    // Should trigger search
    cy.get('[data-testid="search-loading"]').should('exist');
  });

  it('should navigate to company details when clicked', () => {
    // Perform search
    cy.get('input[placeholder*="企業名または銘柄コード"]').type('トヨタ');
    cy.get('button').contains('検索').click();
    
    // Wait for results and click on first company
    cy.get('[data-testid="company-card"]', { timeout: 10000 }).first().click();
    
    // Should navigate to company details
    cy.contains('財務サマリー', { timeout: 10000 }).should('be.visible');
    
    // Should show back to search button
    cy.contains('← 検索に戻る').should('be.visible').click();
    
    // Should return to search page
    cy.contains('企業検索').should('be.visible');
  });
});
describe('Login Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
  });

  it('should display login form', () => {
    cy.visit('/');
    
    cy.contains('株式分析ヘルパー').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button').contains('ログイン').should('be.visible');
  });

  it('should have pre-filled test credentials', () => {
    cy.visit('/');
    
    cy.get('input[type="email"]').should('have.value', 'testuser@example.com');
    cy.get('input[type="password"]').should('have.value', 'TestPassword123@');
  });

  it('should login successfully with test credentials', () => {
    cy.visit('/');
    
    // Click login button with pre-filled credentials
    cy.get('button').contains('ログイン').click();
    
    // Should redirect to main app
    cy.url().should('eq', 'http://localhost:3000/');
    cy.contains('株式分析ヘルパー').should('be.visible');
    
    // Should see mobile navigation
    cy.get('[data-testid="bottom-nav"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.visit('/');
    
    // Clear and enter invalid credentials
    cy.get('input[type="email"]').clear().type('invalid@example.com');
    cy.get('input[type="password"]').clear().type('wrongpassword');
    
    cy.get('button').contains('ログイン').click();
    
    // Should show error message
    cy.contains('ログインに失敗しました').should('be.visible');
  });

  it('should prevent login with empty fields', () => {
    cy.visit('/');
    
    // Clear credentials
    cy.get('input[type="email"]').clear();
    cy.get('input[type="password"]').clear();
    
    // Login button should be disabled or form should not submit
    cy.get('button').contains('ログイン').click();
    
    // Should remain on login page
    cy.contains('ログイン').should('be.visible');
  });
});
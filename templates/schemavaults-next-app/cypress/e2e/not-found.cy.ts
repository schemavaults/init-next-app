describe("Not found page", () => {
  it("shows the app's name for an unknown URL", () => {
    cy.visit("/this-page-does-not-exist", { failOnStatusCode: false });
    cy.contains("h1", "xxx_display_name_xxx");
    cy.contains("404: Page not found");
  });
});

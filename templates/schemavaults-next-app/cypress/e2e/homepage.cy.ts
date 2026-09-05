describe("Homepage", () => {
  it("loads and connects to the app", () => {
    cy.visit("/");
    cy.contains("Welcome to your new app: xxx_display_name_xxx");
  });
});

export function homepageCypressTestTemplate(displayName: string): string {
  return `describe("Homepage", () => {
  it("loads and connects to the app", () => {
    cy.visit("/");
    cy.contains("Welcome to your new app: ${displayName}");
  });
});
`;
}

export default homepageCypressTestTemplate;

describe("API routes and OpenAPI docs", () => {
  it("serves the health check", () => {
    cy.request("/api/health").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.status).to.eq("ok");
    });
  });

  it("validates path, query and body parameters", () => {
    cy.request("/api/greet/Ada?greeting=Howdy&shout=true").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.message).to.eq("HOWDY, ADA!");
    });
    cy.request({
      url: "/api/greet/Ada?shout=maybe",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.error.code).to.eq("validation_error");
      expect(response.body.error.issues[0].path).to.eq("query.shout");
    });
    cy.request({
      method: "POST",
      url: "/api/greet/Ada",
      body: { greeting: "Good morning", punctuation: "." },
    }).then((response) => {
      expect(response.status).to.eq(201);
      expect(response.body.message).to.eq("Good morning, Ada.");
    });
  });

  it("rejects unauthenticated calls to protected operations", () => {
    // 401 once SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY is configured; the
    // auth guard answers 500 when the key manager has no key (e.g. in e2e).
    cy.request({ url: "/api/me", failOnStatusCode: false }).then((response) => {
      expect(response.status).to.be.oneOf([401, 500]);
      expect(response.body.success).to.eq(false);
    });
  });

  it("serves openapi.json and renders it at /docs", () => {
    cy.request("/openapi.json").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.openapi).to.match(/^3\./);
      expect(response.body.paths).to.have.property("/api/health");
    });
    cy.visit("/docs");
    cy.contains("h1", "xxx_display_name_xxx");
    cy.contains("Health check");
    cy.get("#op-getHealth").should("exist");
    cy.get("#schema-HealthResponse").should("exist");
  });
});

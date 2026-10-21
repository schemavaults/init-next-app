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
      expect(response.body.success).to.eq(false);
      expect(response.body.error).to.eq("validation_error");
      expect(response.body.issues[0].location).to.eq("query");
      expect(response.body.issues[0].path).to.eq("shout");
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
    cy.request({ url: "/api/me", failOnStatusCode: false }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.success).to.eq(false);
      expect(response.body.error).to.eq("unauthorized");
    });
  });

  it("serves OAuth protected resource metadata (RFC 9728)", () => {
    cy.request({
      url: "/.well-known/oauth-protected-resource",
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.headers["access-control-allow-origin"]).to.eq("*");
      expect(response.headers["content-type"]).to.include("application/json");
      // 404 while SCHEMAVAULTS_RESOURCE_URL is unset; never a 500
      // (an invalid resource URL) or Next.js's not-found page.
      expect(response.status).to.be.oneOf([200, 404]);
      if (response.status === 404) {
        expect(response.body.error).to.eq("not_found");
        return;
      }
      expect(response.body.resource).to.be.a("string");
      expect(response.body.authorization_servers).to.have.length.greaterThan(0);
      expect(response.body.bearer_methods_supported).to.deep.eq(["header"]);
      expect(response.body.resource_documentation).to.match(/\/docs$/);
    });
    cy.request({
      method: "OPTIONS",
      url: "/.well-known/oauth-protected-resource",
      headers: { "Access-Control-Request-Method": "GET" },
    }).then((response) => {
      expect(response.status).to.eq(204);
      expect(response.headers["access-control-allow-origin"]).to.eq("*");
    });
  });

  it("serves openapi.json and renders it at /docs", () => {
    cy.request("/openapi.json").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.openapi).to.match(/^3\./);
      expect(response.body.paths).to.have.property("/api/health");
    });
    cy.visit("/docs");
    cy.contains("xxx_display_name_xxx");
    cy.contains("Health check");
    cy.visit("/docs/get-api-health");
    cy.contains("Health check");
    cy.contains("/api/health");
  });
});

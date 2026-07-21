export function dockerComposeTemplate(
  projectName: string,
  dbhVersion: string,
  cypressVersion: string,
  authServerUrl: string,
): string {
  return `services:
  postgres:
    image: postgres:17.7
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${projectName}
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-ws-proxy:
    image: ghcr.io/schemavaults/dbh/postgres-ws-proxy:${dbhVersion}
    ports:
      - "5433:5433"
    environment:
      PGHOST: postgres
      PGPORT: 5432
    depends_on:
      postgres:
        condition: service_healthy

  app:
    build:
      context: .
      args:
        SCHEMAVAULTS_CLIENT_APP_ID: \${SCHEMAVAULTS_CLIENT_APP_ID}
        SCHEMAVAULTS_API_SERVER_ID: \${SCHEMAVAULTS_API_SERVER_ID}
        SCHEMAVAULTS_AUTH_SERVER_URL: \${SCHEMAVAULTS_AUTH_SERVER_URL:-${authServerUrl}}
    container_name: ${projectName}
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - postgres-ws-proxy
    healthcheck:
      test: ["CMD-SHELL", "node -e \\"require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))\\""]
      interval: 5s
      timeout: 5s
      retries: 30
      start_period: 10s

  cypress:
    image: cypress/included:${cypressVersion}
    working_dir: /e2e
    volumes:
      - ./cypress:/e2e/cypress
      - ./cypress.config.ts:/e2e/cypress.config.ts:ro
    environment:
      CYPRESS_baseUrl: http://app:3000
    depends_on:
      app:
        condition: service_healthy
    profiles:
      - e2e
`;
}

export default dockerComposeTemplate;

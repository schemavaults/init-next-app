import versions from "../../config/versions.json";

export function dockerComposeTemplate(projectName: string): string {
  const dbhVersion = versions["@schemavaults/dbh"];

  return `services:
  postgres:
    image: postgres:17-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ${projectName}
    volumes:
      - pgdata:/var/lib/postgresql/data
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
    build: .
    container_name: ${projectName}
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - postgres-ws-proxy

volumes:
  pgdata:
`;
}

export default dockerComposeTemplate;

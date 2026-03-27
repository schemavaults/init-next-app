const fakeUuid: string = "00000000-0000-0000-0000-000000000000";

export function exampleEnvTemplate(): string {
  return `# .env.example - Environment variables required

# SchemaVaults Auth/Apps Configuration
SCHEMAVAULTS_CLIENT_APP_ID="${fakeUuid}"
SCHEMAVAULTS_API_SERVER_ID="${fakeUuid}"
SCHEMAVAULTS_APP_ENVIRONMENT="production"
SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY=""

# Database Credentials
POSTGRES_URL=""
POSTGRES_PRISMA_URL=""
POSTGRES_URL_NO_SSL=""
POSTGRES_URL_NON_POOLING=""
POSTGRES_USER=""
POSTGRES_HOST=""
POSTGRES_PASSWORD=""
POSTGRES_DATABASE=""
`;
}

export default exampleEnvTemplate;

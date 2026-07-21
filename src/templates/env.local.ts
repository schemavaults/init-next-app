export function envLocalTemplate(
  clientAppId: string,
  apiServerId: string,
  authServerUrl: string,
): string {
  return `# .env.local - Local development defaults

# SchemaVaults Auth/Apps Configuration
SCHEMAVAULTS_CLIENT_APP_ID="${clientAppId}"
SCHEMAVAULTS_API_SERVER_ID="${apiServerId}"
SCHEMAVAULTS_AUTH_SERVER_URL="${authServerUrl}"
`;
}

export default envLocalTemplate;

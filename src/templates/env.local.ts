export function envLocalTemplate(
  clientAppId: string,
  apiServerId: string,
): string {
  return `# .env.local - Local development defaults

# SchemaVaults Auth/Apps Configuration
SCHEMAVAULTS_CLIENT_APP_ID="${clientAppId}"
SCHEMAVAULTS_API_SERVER_ID="${apiServerId}"
`;
}

export default envLocalTemplate;

const fakeUuid: string = "00000000-0000-0000-0000-000000000000";

export function exampleEnvTemplate(): string {
  return `SCHEMAVAULTS_CLIENT_APP_ID="${fakeUuid}"
SCHEMAVAULTS_API_SERVER_ID="${fakeUuid}"
SCHEMAVAULTS_APP_ENVIRONMENT="production"
`;
}

export default exampleEnvTemplate;

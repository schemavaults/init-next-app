export function vercelJsonTemplate(): string {
  return `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "outputDirectory": ".next"
}
`;
}

export default vercelJsonTemplate;

export function pageTemplate(): string {
  return `import Link from "next/link";

  export default function Home() {
  return (
    <main>
      <h1>Welcome to your new app</h1>
      <Link href="/auth/login">Login</Link>
      <Link href="/auth/register">Register</Link>
    </main>
  );
}
`;
}

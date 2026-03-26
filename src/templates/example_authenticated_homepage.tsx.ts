export function exampleAuthenticatedHomepageTemplate(): string {
  return `import Link from "next/link";

  export default function ExampleLoggedInHomepage() {
  return (
    <main>
      <h1>You are logged in to your new app!</h1>
      <Link href="/auth/logout">Logout</Link>
    </main>
  );
}
`;
}

export default exampleAuthenticatedHomepageTemplate;

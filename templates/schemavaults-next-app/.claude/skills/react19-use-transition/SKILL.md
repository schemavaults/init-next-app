---
name: react19-use-transition
description: Use when a client component submits a form, calls an API route or server action, or awaits other async work and needs a pending state (a disabled button, a spinner, "Saving…"). In React 19, track it with useTransition and an async function passed to startTransition, not with useState(false) and try/catch/finally { setLoading(false) }.
---

# Track pending async work with `useTransition`

In React 19, `startTransition` accepts an async function (an *Action*).
`isPending` is `true` from the moment you call it until that function settles,
whether it succeeds or fails. You don't need a loading flag to set and reset
by hand, and a forgotten `finally` can't leave the form stuck in a pending
state.

## Before and after

```tsx
// Don't: manual loading flag
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
  event.preventDefault();
  setLoading(true);
  setError(null);
  try {
    await saveItem(new FormData(event.currentTarget));
    router.push("/items");
  } catch (e) {
    setError(e instanceof Error ? e.message : "Something went wrong");
  } finally {
    setLoading(false);
  }
}
```

```tsx
// Do: useTransition with an async function
"use client";
import { useState, useTransition, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@schemavaults/ui";

export function ItemForm(): ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget); // read the event before starting
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      if (!response.ok) {
        const body: { message?: string } | null = await response.json().catch(() => null);
        setError(body?.message ?? "Could not save the item.");
        return;
      }
      router.push("/items");
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="name" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save"}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
```

## Rules

- Read everything you need from the event (`preventDefault()`, `FormData`,
  `currentTarget`) **before** calling `startTransition`. After the first
  `await`, React has finished dispatching the event and `currentTarget` is
  `null`.
- Disable the submit button with `disabled={isPending}`, so the form can't be
  submitted twice.
- Handle expected failures, such as error responses from the API, inside the
  action: set error state and `return`.
- An error *thrown* from the action goes to the nearest error boundary
  (`error.tsx`, or `global-error.tsx` for the whole app), which replaces the
  UI. To show something inline instead, such as a network failure from
  `fetch`, catch it inside the action. `try`/`catch` is still fine. What goes
  away is the loading flag and `finally { setLoading(false) }`.
- State updates after an `await` aren't marked as part of the transition.
  Plain updates such as `setError(...)` work as written. If an update after an
  `await` must render as a transition (to keep showing the current UI while
  something suspends), wrap it: `startTransition(() => setTab("done"))`.
- Use one `useTransition` per independent action, such as Save and Delete,
  so each control shows its own pending state.
- Don't copy `isPending` into state or sync it with `useEffect`; read it
  directly.

## Related React 19 APIs

These are built on the same transitions and also replace manual loading
flags:

- `useActionState(action, initialState)` returns
  `[state, formAction, isPending]`. Use it with `<form action={formAction}>`
  when the action's result is what you render, such as field errors.
- `useFormStatus()` gives `pending` to a submit button component rendered
  inside a `<form action={...}>`, without passing props down.

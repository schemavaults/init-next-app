---
name: react19-no-forward-ref
description: Use when writing or editing a React component that accepts a ref (wrapping an input, button or other element, exposing an imperative handle with useImperativeHandle), or when you see forwardRef in this codebase. This app runs React 19, where function components receive ref as a regular prop and forwardRef is deprecated. Pass refs directly as props instead.
---

# Pass `ref` as a prop, not through `forwardRef`

This app runs React 19 (see `package.json`). Function components receive
`ref` as an ordinary prop, so `forwardRef` is no longer needed. React's docs
mark it deprecated in favour of the `ref` prop, and a future release will
remove it. Don't write new `forwardRef` calls. When you edit a component that
uses one, convert it.

## Before and after

```tsx
// Don't: React 18 style
import { forwardRef } from "react";

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, ...props },
  ref,
) {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
});
TextInput.displayName = "TextInput";
```

```tsx
// Do: ref is a prop
import type { ComponentProps, ReactElement } from "react";

interface TextInputProps extends ComponentProps<"input"> {
  label: string;
}

export function TextInput({ label, ref, ...props }: TextInputProps): ReactElement {
  return (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  );
}
```

Callers don't change: `<TextInput ref={inputRef} label="Name" />`.

## Typing the `ref` prop

| The component... | Props type |
| --- | --- |
| Wraps a DOM element | `ComponentProps<"input">` includes `ref?: Ref<HTMLInputElement>` |
| Wraps another component | `ComponentProps<typeof Button>` |
| Takes a ref for something else | Declare it: `ref?: Ref<HTMLDivElement>` |
| Exposes an imperative handle | `ref?: Ref<MyHandle>` with `useImperativeHandle` (below) |

`ComponentPropsWithoutRef<...>` removes `ref`, so don't use it for a
component that should accept one.

## Imperative handles

`useImperativeHandle` takes the `ref` prop directly:

```tsx
"use client";
import { useImperativeHandle, useRef, type ReactElement, type Ref } from "react";

export interface VideoPlayerHandle {
  play(): void;
  pause(): void;
}

interface VideoPlayerProps {
  src: string;
  ref?: Ref<VideoPlayerHandle>;
}

export function VideoPlayer({ src, ref }: VideoPlayerProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({
    play: () => void videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }), []);
  return <video ref={videoRef} src={src} />;
}
```

## When converting

- Move the second `forwardRef` argument into the props destructuring, and
  move the type arguments into the props type, as above.
- Delete `displayName` assignments that only existed because `forwardRef`
  wrapped an anonymous function.
- Callback refs can now return a cleanup function, so TypeScript rejects
  callback refs that return anything else. Write
  `ref={(el) => { node = el; }}`, not `ref={(el) => (node = el)}`.
- Components from libraries such as `@schemavaults/ui` may still use
  `forwardRef` internally. Passing them a `ref` works the same way; leave
  library code alone.

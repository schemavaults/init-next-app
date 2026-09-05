---
name: nextjs-docs
description: Use when you need Next.js documentation — App Router conventions, next.config options, caching/rendering semantics, route handlers, middleware, metadata, built-in components, router/server functions, CLI flags, or upgrade/deprecation questions. The installed next package ships its own docs, so consult them instead of web searches or memory: they exactly match the version this project runs.
---

# Next.js documentation (version-matched, offline)

The `next` package bundles the official documentation for **the exact
installed version** at:

```
./node_modules/next/dist/docs/
```

Always prefer these files over recalling Next.js behavior from memory or
searching the web — APIs, defaults, and caching semantics change between
versions, and these docs cannot drift from the version in `package.json`.

## How to use them

The docs' directory layout also changes between Next.js versions, so
**discover the structure fresh rather than assuming one**:

1. Orient: list the docs root (`ls node_modules/next/dist/docs/`) and read
   the `index.md` overview files that directories contain.
2. This project uses the **App Router**, so prefer the App Router section of
   the docs over the Pages Router one when both cover a topic.
3. Find a known API or config option by filename, e.g.
   `Glob node_modules/next/dist/docs/**/use-router*`
4. When unsure where a topic lives, search contents, e.g.
   `Grep pattern:"revalidatePath" path:"node_modules/next/dist/docs" -l`
5. For upgrade or deprecation questions, look for the upgrading/migration
   guides in the docs before proposing changes or codemods from memory.

Cite the doc file path your answer leans on, so claims are checkable against
the installed version.

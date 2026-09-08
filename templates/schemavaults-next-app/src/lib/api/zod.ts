/**
 * The `zod` instance used by every API operation, with
 * `@asteasolutions/zod-to-openapi`'s `.openapi()` extension installed.
 *
 * Always import `z` from here (or from `@/lib/api/define`, which re-exports
 * it) inside `operations.ts` files, never from "zod" directly, so that the
 * extension is guaranteed to be installed before any schema is built.
 */
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export { z };

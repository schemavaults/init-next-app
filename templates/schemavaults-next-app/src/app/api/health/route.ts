import { apiRoute } from "@/lib/api/api";
import { getHealth } from "./operations";

export const { GET } = apiRoute([getHealth]);

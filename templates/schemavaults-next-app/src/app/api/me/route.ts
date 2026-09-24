import { apiRoute } from "@/lib/api/api";
import { getCurrentUser } from "./operations";

export const { GET } = apiRoute([getCurrentUser]);

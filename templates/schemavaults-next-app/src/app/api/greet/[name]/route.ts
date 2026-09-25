import { apiRoute } from "@/lib/api/api";
import { createGreeting, getGreeting } from "./operations";

export const { GET, POST } = apiRoute([getGreeting, createGreeting]);

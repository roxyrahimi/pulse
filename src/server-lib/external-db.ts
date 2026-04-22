import axios from "axios";
import { vybeRequestInterceptor } from "./vybe-request-interceptor";

const vybeDomain =
  process.env.VYBE_SERVER_CALLBACK_URL ?? process.env.NEXT_PUBLIC_VYBE_INTEGRATIONS_DOMAIN ?? "https://vybe.build";

export const externalDbClient = axios.create({
  baseURL: vybeDomain + "/api/external-databases",
  withCredentials: true,
});

externalDbClient.interceptors.request.use(vybeRequestInterceptor);

import { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { headers } from "next/headers";

/**
 * Axios request interceptor that adds authentication headers for Vybe API calls.
 */
export async function vybeRequestInterceptor(config: InternalAxiosRequestConfig) {
  const axiosHeaders = AxiosHeaders.from(config.headers);

  // Add server secret for server-to-server auth
  const serverSecret = process.env.VYBE_SERVER_SECRET;
  if (serverSecret) {
    axiosHeaders.set("VYBE_SERVER_SECRET", serverSecret);
  }

  // Forward VUT from incoming request for user-level access
  try {
    const incomingHeaders = await headers();
    const vut = incomingHeaders.get("x-vybe-user-token");
    if (vut) {
      axiosHeaders.set("x-vybe-user-token", vut);
    }
  } catch (error) {
    console.warn("Unexpected error reading request headers for VUT forwarding:", error);
  }

  config.headers = axiosHeaders;
  return config;
}

import axios from "axios";
import { vybeRequestInterceptor } from "./vybe-request-interceptor";

interface RunActionParams {
  actionId: string;
  accountId: string;
  input?: unknown;
}

const vybeDomain =
  process.env.VYBE_SERVER_CALLBACK_URL ?? process.env.NEXT_PUBLIC_VYBE_INTEGRATIONS_DOMAIN ?? "https://vybe.build";

export const serverIntegrationClient = axios.create({
  baseURL: vybeDomain + "/api/integrations",
});

serverIntegrationClient.interceptors.request.use(vybeRequestInterceptor);

/**
 * Run an action on an integration.
 * This function can only be used server side and should NEVER be used client side.
 * @param actionParams.actionId - The id of the action to run - the name of the tool that you have tested, if you don't know the action id check which tools are available to you first and test the tool before using this function.
 * @param actionParams.accountId - The id of the account to run the action on.
 * @param actionParams.input - optional, depending on the tested tool input schema / configured props - The input to pass to the action.
 * @returns The response from the action
 */
export async function runIntegrationActionFromServer<ResponseType>(
  actionParams: RunActionParams,
): Promise<ResponseType> {
  const { accountId, ...rest } = actionParams;
  const response = await serverIntegrationClient.post<ResponseType>(`/accounts/${accountId}/execute`, rest);
  return response.data;
}

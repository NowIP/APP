import * as api from "@/api-client";
import { client } from "@/api-client/client.gen";

export function useAPI(disableAuthRedirect = false) {

    const sessionToken = useCookie("session_token");

    const apiURL = useRuntimeConfig().public.apiUrl;

    if (sessionToken.value) {
        client.setConfig({
            baseURL: apiURL,
            headers: {
                Authorization: `Bearer ${sessionToken.value}`
            }
        });
    }

    if (!sessionToken.value) {
        client.setConfig({
            baseURL: apiURL
        });
        if (!disableAuthRedirect) {
            navigateTo('/auth/login?url=' + encodeURIComponent(useRoute().fullPath));
        }
    }

    return api;
}
import * as api from "@/api-client";

export function useAPI(disableAuthRedirect = false) {

    const sessionToken = useCookie("session_token");

    const apiURL = useRuntimeConfig().public.apiUrl;

    if (sessionToken.value) {
        updateAPIClient(sessionToken.value);
    }

    if (!sessionToken.value) {
        updateAPIClient(null);
        if (!disableAuthRedirect) {
            navigateTo('/auth/login?url=' + encodeURIComponent(useRoute().fullPath));
        }
    }

    return api;
}
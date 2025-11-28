import { SessionStore } from "@/utils/userStore";
import { useAPI } from "@/composables/useAPI";

export default defineNuxtRouteMiddleware(async(to) => {

    const token = useCookie("session_token").value;

    if (to.path.startsWith('/auth')) {
        if (!token) {
            return;
        }
        return navigateTo('/');
    }

    if (!token) {
        return navigateTo('/auth/login?url=' + encodeURIComponent(to.fullPath));
    }
    
});
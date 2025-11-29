import { UserStore } from "~/utils/stores/userStore";

export default defineNuxtRouteMiddleware(async(to) => {

    const token = useCookie("session_token").value;

    await UserStore.fetchAndSetIfNeeded();

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
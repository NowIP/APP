import { reactive } from "vue";
import type { GetAuthSessionResponses } from "@/api-client/types.gen";

type UserAuthInfo = Omit<GetAuthSessionResponses["200"]["data"], "expires_at" | "token">;

export class SessionStore {

    private static readonly userInfo = reactive<UserAuthInfo>({} as any);

    static useUserInfo() {
        return this.userInfo;
    }

    static setUserInfo(userInfo: UserAuthInfo) {
        for (const key in userInfo) {
            (this.userInfo as any)[key] = (userInfo as any)[key];
        }
    }

}
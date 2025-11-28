import { reactive } from "vue";
import type { GetAccountResponses } from "@/api-client/types.gen";

type UserInfo = GetAccountResponses["200"]["data"];

export class SessionStore {

    private static readonly userInfo = reactive<UserInfo>({} as any);

    static async useUserInfo() {
        if (!this.userInfo.id) {
            await this.fetchAndSetUserInfo();
        }
        return this.userInfo;
    }

    static setUserInfo(userInfo: UserInfo) {
        for (const key in userInfo) {
            (this.userInfo as any)[key] = (userInfo as any)[key];
        }
    }

    static async fetchAndSetUserInfo() {
        const result = await useAPI().getAccount({});
        if (result.success) {
            this.setUserInfo(result.data);
        }
    }

}
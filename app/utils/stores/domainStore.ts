import type { GetDomainsResponse } from "~/api-client";

type Domains = GetDomainsResponse["data"];

export class DomainStore {

    private static readonly data = reactive<Domains>([]);

    static async use() {
        return this.data;
    }

    static set(newData: Domains) {
        this.data.splice(0, this.data.length);
        this.data.push(...newData);
    }

    static async fetchAndSet() {
        const result = await useAPI((api) => {
            return api.getDomains({});
        });
        if (result.success) {
            this.set(result.data);
        }
    }

    static clear() {
        this.data.splice(0, this.data.length);
    }
}

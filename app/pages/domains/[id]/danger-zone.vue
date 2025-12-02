<script setup lang="ts">
import type { GetDomainsDomainIdResponse } from '~/api-client/types.gen';
import { DomainStore } from '~/utils/stores/domainStore';

type Domain = GetDomainsDomainIdResponse['data'];

const domain = inject<Domain>('domain') as Domain;
const domainID = inject<string>('domainId') as string;
const refreshDomain = inject<() => Promise<void>>('refreshDomain') as () => Promise<void>;

const toast = useToast();

if (!domain || !domainID) {
    throw new Error('Domain context is missing.');
}

async function deleteDomain() {

    try {

        const response = await useAPI((api) => {
            return api.deleteDomainsDomainId({
                path: {
                    domainID
                },
                ignoreResponseError: true
            });
        });

        if (response && response.success === true) {

            toast.add({
                title: 'Domain Deleted',
                description: `The domain "${domain.subdomain}" has been successfully deleted.`,
                color: 'success'
            });

            await DomainStore.fetchAndSet();

            await navigateTo('/domains');

        } else {
            toast.add({
                title: 'Error',
                description: response?.message || 'An error occurred while deleting the domain.',
                color: 'error'
            });
        }
    } catch (error) {
        toast.add({
            title: 'Error',
            description: (error as Error).message || 'An error occurred while deleting the domain.',
            color: 'error'
        });
    }

}

</script>

<template>
    <UPageCard title="Danger Zone"
        description="Deleting the domain is irreversible. All associated data will be permanently removed."
        class="from-error/10 from-5% to-default">
        <template #footer>
            <UButton label="Delete Domain" color="error" @click="deleteDomain" />
        </template>
    </UPageCard>
</template>
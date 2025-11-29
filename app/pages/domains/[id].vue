<script setup lang="ts">
import { computed, reactive, provide } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { GetDomainsDomainIdResponse } from '~/api-client'

const route = useRoute();
const domainID = route.params.id as string;
const isNewDomain = computed(() => domainID === 'new');

if (isNewDomain.value && !useRoute().path.endsWith('/new')) {
    navigateTo('/domains/new');
} 

type Domain = GetDomainsDomainIdResponse['data'];

const domain = reactive<Domain>({
    id: 0,
    owner_id: 0,
    subdomain: '',
    last_ipv4: null,
    last_ipv6: null,
    last_ddns_update: null,
    ddnsv2_api_secret: ''
});

const fetchDomain = async () => {
    if (isNewDomain.value) {
        return;
    }

    const result = await useAPI().getDomainsDomainId({
        ignoreResponseError: true,
        path: { domainID }
    });

    if (!result.success) {
        throw createError({ statusCode: result.code, statusMessage: result.message });
    }

    Object.assign(domain, result.data);
};

await fetchDomain();

provide('domain', domain);
provide('domainId', domainID);
provide('isNewDomain', isNewDomain);
provide('refreshDomain', fetchDomain);

const links = computed<NavigationMenuItem[][]>(() => {
    const base: NavigationMenuItem[][] = [[{
        label: 'General',
        icon: 'i-lucide-user',
        to: `/domains/${domainID}`,
        exact: true
    }]];

    if (!isNewDomain.value) {
        (base[0] as NavigationMenuItem[]).push({
            label: 'DNS Records',
            icon: 'i-lucide-database',
            to: `/domains/${domainID}/dns-records`
        }, {
            label: 'Danger Zone',
            icon: 'i-lucide-shield',
            to: `/domains/${domainID}/danger-zone`
        });
    }

    return base;
});

const panelTitle = computed(() => isNewDomain.value ? 'Create Domain' : 'Manage Domain');

</script>

<template>
    <UDashboardPanel :id="`manage-domain-${domainID}`" :ui="{ body: 'lg:py-12' }">
        <template #header>
            <UDashboardNavbar :title="panelTitle">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>

            <UDashboardToolbar>
                <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
                <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
            </UDashboardToolbar>
        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-6xl mx-auto">
                <NuxtPage />
            </div>
        </template>
    </UDashboardPanel>
</template>

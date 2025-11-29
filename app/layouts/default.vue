<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { GetDomainsResponse } from '~/api-client';
import NowIPLogo from '~/components/img/NowIPLogo.vue'
import { DomainStore } from '../utils/stores/domainStore';

const open = ref(false)

const domains = await DomainStore.use();

const closeSidebar = () => {
    open.value = false;
};

// Keep the sidebar list predictable by always sorting domains alphabetically.
const sortedDomains = computed(() => {
    return [...domains].sort((a, b) =>
        getFullDomain(a.subdomain).localeCompare(getFullDomain(b.subdomain))
    );
});

// Show either each domain shortcut or an empty-state call-to-action.
const domainSection = computed<NavigationMenuItem>(() => {
    const baseChildren: NavigationMenuItem[] = [
        {
            label: 'Overview',
            icon: 'i-lucide-layout-dashboard',
            to: '/domains',
            exact: true,
            onSelect: closeSidebar
        },
        {
            label: 'Add domain',
            icon: 'i-lucide-plus',
            to: '/domains/new',
            onSelect: closeSidebar
        }
    ];

    if (!sortedDomains.value.length) {
        return {
            label: 'Domains',
            icon: 'i-lucide-globe',
            badge: '0',
            description: 'Add your first domain',
            type: 'trigger',
            defaultOpen: true,
            children: baseChildren
        } satisfies NavigationMenuItem;
    }

    const domainLinks: NavigationMenuItem[] = sortedDomains.value.map((domain: GetDomainsResponse["data"][0]) => ({
        label: getFullDomain(domain.subdomain),
        icon: 'i-lucide-globe-2',
        to: `/domains/${domain.id}`,
        onSelect: closeSidebar
    }));

    return {
        label: 'Domains',
        icon: 'i-lucide-globe',
        badge: String(sortedDomains.value.length),
        type: 'trigger',
        defaultOpen: true,
        children: [
            ...baseChildren,
            {
                label: 'Your domains',
                type: 'label'
            },
            ...domainLinks
        ]
    } satisfies NavigationMenuItem;
});

const links = computed<NavigationMenuItem[]>(() => [
    {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/',
        onSelect: closeSidebar
    },
    domainSection.value,
    {
        label: 'Settings',
        to: '/settings',
        icon: 'i-lucide-settings',
        class: 'mt-4 pt-4 border-t-2 border-default',
        defaultOpen: true,
        type: 'trigger',
        children: [
            {
                label: 'General',
                to: '/settings',
                exact: true,
                onSelect: closeSidebar
            },
            {
                label: 'Security',
                to: '/settings/security',
                onSelect: closeSidebar
            }
        ]
    }
] satisfies NavigationMenuItem[]);


</script>

<template>
    <UDashboardGroup unit="rem">
        <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25"
            :ui="{ footer: 'lg:border-t lg:border-default' }">
            <template #header>
                <NowIPLogo class="h-10 w-auto my-3 lg:mx-2" />
            </template>

            <template #default="{ collapsed }">
                <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" tooltip popover />
            </template>

            <template #footer="{ collapsed }">
                <UserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <slot />
    </UDashboardGroup>
</template>

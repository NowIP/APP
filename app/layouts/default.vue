<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { GetDomainsResponse } from '~/api-client';
import NowIPLogo from '~/components/img/NowIPLogo.vue'
import { DomainStore } from '../utils/stores/domainStore';

const open = ref(false)
const expandedItems = ref<string[]>(['domains'])

watch(expandedItems, (value) => {
    if (!value.includes('domains')) {
        expandedItems.value = [...value, 'domains']
    }
})

const domains = await DomainStore.use();

// Keep the sidebar list predictable by always sorting domains alphabetically.
const sortedDomains = computed(() => {
    return [...domains].sort((a, b) =>
        getFullDomain(a.subdomain).localeCompare(getFullDomain(b.subdomain))
    );
});

// Show either each domain shortcut or an empty-state call-to-action.
const domainChildren = computed(() => {
    if (!sortedDomains.value.length) {
        return [
            {
                label: 'No domains yet',
                description: 'Add a domain to start managing DNS records.',
                icon: 'i-lucide-info',
                disabled: true
            },
            {
                label: 'Add domain',
                icon: 'i-lucide-plus',
                to: '/domains',
                onSelect: () => {
                    open.value = false
                }
            }
        ]
    }

    return sortedDomains.value.map((domain: GetDomainsResponse["data"][0]) => ({
        label: getFullDomain(domain.subdomain),
        icon: 'i-lucide-globe-2',
        to: `/domains/${domain.id}`,
        onSelect: () => {
            open.value = false
        }
    }));
});

const links = computed<NavigationMenuItem[]>(() => [
    {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/',
        onSelect: () => {
            open.value = false
        }
    },
    {
        label: 'Domains',
        icon: 'i-lucide-globe',
        badge: sortedDomains.value.length || undefined,
        to: '/domains',
        defaultOpen: true,
        value: 'domains',
        onSelect: () => {
            open.value = false
        },
        children: domainChildren.value
    },
    {
        label: 'Settings',
        to: '/settings',
        icon: 'i-lucide-settings',
        defaultOpen: true,
        type: 'trigger',
        children: [
            {
                label: 'General',
                to: '/settings',
                exact: true,
                onSelect: () => {
                    open.value = false
                }
            },
            {
                label: 'Security',
                to: '/settings/security',
                onSelect: () => {
                    open.value = false
                }
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
                <UNavigationMenu v-model="expandedItems" type="multiple" :collapsed="collapsed" :items="links"
                    orientation="vertical" tooltip popover />
            </template>

            <template #footer="{ collapsed }">
                <UserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <slot />
    </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { GetDomainsResponse } from '~/api-client';
import NowIPLogo from '~/components/img/NowIPLogo.vue'
import { DomainStore } from '../utils/stores/domainStore';

const open = ref(false)

const domains = await DomainStore.use();

const domainChildren = computed<NavigationMenuItem[]>(() => {
    return domains.map((domain: GetDomainsResponse["data"][0]) => ({
        label: getFullDomain(domain.subdomain),
        to: `/domains/${domain.id}`,
        onSelect: () => {
            open.value = false
        }
    }))
})

const links = reactive<NavigationMenuItem[]>([
    {
        label: 'Home',
        icon: 'i-lucide-house',
        to: '/',
        onSelect: () => {
            open.value = false
        }
    }, {
        label: 'Domains',
        icon: 'i-lucide-globe',
        to: '/domains',        
        defaultOpen: true,
        onSelect: () => {
            open.value = false
        },
        children: domainChildren.value
    }, {
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
            }, {
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
                <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" tooltip popover />
            </template>

            <template #footer="{ collapsed }">
                <UserMenu :collapsed="collapsed" />
            </template>
        </UDashboardSidebar>

        <slot />
    </UDashboardGroup>
</template>

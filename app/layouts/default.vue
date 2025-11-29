<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import NowIPLogo from '~/components/img/NowIPLogo.vue'

const open = ref(false)

const links = [
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
        onSelect: () => {
            open.value = false
        }
    }, {
        label: 'Settings',
        to: '/settings',
        icon: 'i-lucide-settings',
        defaultOpen: true,
        type: 'trigger',
        children: [{
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
        }]
    }] satisfies NavigationMenuItem[]


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

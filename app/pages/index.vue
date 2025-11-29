<script setup lang="ts">
import { computed } from 'vue';
import type { TableColumn } from '@nuxt/ui';
import type { GetDomainsResponse } from '~/api-client';
import { getFullDomain } from '~/composables/getFullDomain';
import { DomainStore } from '~/utils/stores/domainStore';

useSeoMeta({
    title: 'Dashboard | NowIP',
    description: 'NowIP Dashboard'
});

type Domain = GetDomainsResponse["data"][0];

const domains = await DomainStore.use();

const totalDomains = computed(() => domains.length);
const ipv4Active = computed(() => domains.filter((domain) => Boolean(domain.last_ipv4)).length);
const ipv6Active = computed(() => domains.filter((domain) => Boolean(domain.last_ipv6)).length);
const unreachableDomains = computed(() => domains.filter((domain) => !domain.last_ipv4 && !domain.last_ipv6).length);

const normalizeTimestamp = (timestamp: number) => (timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp);

const lastUpdateDate = computed(() => {
    const timestamps = domains
        .map((domain) => domain.last_ddns_update)
        .filter((value): value is number => typeof value === 'number' && value > 0);

    if (!timestamps.length) {
        return null;
    }

    const normalized = normalizeTimestamp(Math.max(...timestamps));
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
});

const formatDateTime = (date: Date) => date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
});

const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp || timestamp <= 0) {
        return 'Never';
    }

    const normalized = normalizeTimestamp(timestamp);
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const lastUpdateRelative = computed(() => {
    if (!lastUpdateDate.value) {
        return 'Waiting for your first DDNS check-in';
    }

    const diffMs = Date.now() - lastUpdateDate.value.getTime();
    if (diffMs < 60_000) {
        return 'Just now';
    }

    const diffMinutes = Math.round(diffMs / 60_000);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
});

type StatCard = {
    label: string;
    value: string;
    description: string;
    icon: string;
};

const statsCards = computed<StatCard[]>(() => {
    const total = totalDomains.value;
    const ipv4 = ipv4Active.value;
    const ipv6 = ipv6Active.value;

    const formatCoverage = (count: number, fallback: string) => {
        if (!total) {
            return {
                value: '0',
                description: fallback
            } satisfies Pick<StatCard, 'value' | 'description'>;
        }

        const percentage = Math.round((count / total) * 100);
        return {
            value: `${count}/${total}`,
            description: `${percentage}% reporting`
        } satisfies Pick<StatCard, 'value' | 'description'>;
    };

    return [
        {
            label: 'Total domains',
            value: total.toString(),
            icon: 'i-lucide-globe',
            description: total ? 'Active NowIP subdomains' : 'Add your first domain to begin'
        },
        {
            label: 'IPv4 reporting',
            icon: 'i-lucide-signal-high',
            ...formatCoverage(ipv4, 'Waiting for IPv4 updates')
        },
        {
            label: 'IPv6 reporting',
            icon: 'i-lucide-radio',
            ...formatCoverage(ipv6, 'Waiting for IPv6 updates')
        },
        {
            label: 'Last DDNS update',
            value: lastUpdateDate.value ? formatDateTime(lastUpdateDate.value) : 'Never',
            icon: 'i-lucide-clock-10',
            description: lastUpdateRelative.value
        }
    ];
});

const recentDomains = computed<Domain[]>(() => {
    if (!domains.length) {
        return [];
    }

    return [...domains]
        .sort((a, b) => {
            const aTs = a.last_ddns_update ?? 0;
            const bTs = b.last_ddns_update ?? 0;
            if (aTs === bTs) {
                return b.id - a.id;
            }
            return bTs - aTs;
        })
        .slice(0, 5);
});

const recentColumns: TableColumn<Domain>[] = [
    {
        accessorKey: 'subdomain',
        header: 'Domain',
        cell: ({ row }) => getFullDomain(row.getValue('subdomain'))
    },
    {
        accessorKey: 'last_ipv4',
        header: 'IPv4',
        cell: ({ row }) => row.getValue('last_ipv4') || '—'
    },
    {
        accessorKey: 'last_ipv6',
        header: 'IPv6',
        cell: ({ row }) => row.getValue('last_ipv6') || '—'
    },
    {
        accessorKey: 'last_ddns_update',
        header: 'Last Update',
        cell: ({ row }) => formatTimestamp(row.getValue('last_ddns_update'))
    }
];

const quickActions = [
    {
        label: 'Add domain',
        description: 'Create a new subdomain and API secret.',
        to: '/domains',
        icon: 'i-lucide-plus'
    },
    {
        label: 'Manage domains',
        description: 'Review DNS records and DDNS activity.',
        to: '/domains',
        icon: 'i-lucide-globe-2'
    },
    {
        label: 'Account settings',
        description: 'Update profile, security, and API access.',
        to: '/settings',
        icon: 'i-lucide-shield'
    }
];

const hasDomains = computed(() => totalDomains.value > 0);

</script>

<template>
    <UDashboardPanel id="home" :ui="{ body: 'lg:py-12' }">
        <template #header>
            <UDashboardNavbar title="Dashboard">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>

                <template #actions>
                    <UButton to="/domains" icon="i-lucide-plus" color="primary">Add domain</UButton>
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-6xl mx-auto">
                <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <UCard v-for="stat in statsCards" :key="stat.label"
                        class="relative overflow-hidden border border-default/40">
                        <div class="flex items-start justify-between">
                            <div>
                                <p class="text-sm text-default-500">{{ stat.label }}</p>
                                <p class="text-3xl font-semibold mt-1">{{ stat.value }}</p>
                            </div>
                            <UIcon :name="stat.icon" class="h-8 w-8 text-primary" />
                        </div>
                        <p class="text-sm text-default-500 mt-3">{{ stat.description }}</p>
                    </UCard>
                </div>

                <UAlert v-if="unreachableDomains" color="warning" icon="i-lucide-alert-triangle"
                    :title="`${unreachableDomains} domain${unreachableDomains === 1 ? '' : 's'} need attention`"
                    :description="'No IPv4 or IPv6 updates received yet.'">
                    <template #actions>
                        <UButton to="/domains" size="xs" variant="subtle">Review domains</UButton>
                    </template>
                </UAlert>

                <UCard>
                    <template #header>
                        <div class="flex flex-col gap-1">
                            <p class="text-base font-medium">Quick actions</p>
                            <p class="text-sm text-default-500">Jump into the most common workflows.</p>
                        </div>
                    </template>
                    <template #default>
                        <div class="grid gap-4 md:grid-cols-3">
                            <div v-for="action in quickActions" :key="action.label"
                                class="flex flex-col gap-2 rounded-lg border border-default/50 p-4">
                                <div class="flex items-center gap-2">
                                    <UIcon :name="action.icon" class="text-primary" />
                                    <p class="font-medium">{{ action.label }}</p>
                                </div>
                                <p class="text-sm text-default-500">{{ action.description }}</p>
                                <div class="mt-auto">
                                    <UButton :to="action.to" variant="ghost" trailing-icon="i-lucide-arrow-right">
                                        Go
                                    </UButton>
                                </div>
                            </div>
                        </div>
                    </template>
                </UCard>

                <UCard>
                    <template #header>
                        <div class="flex flex-col gap-1">
                            <p class="text-base font-medium">Recent domain updates</p>
                            <p class="text-sm text-default-500">
                                Latest DDNS activity across your domains.
                            </p>
                        </div>
                    </template>

                    <template v-if="hasDomains" #default>
                        <UTable :data="recentDomains" :columns="recentColumns" class="flex-1" />
                    </template>
                    <template v-else #default>
                        <div class="flex flex-col items-start gap-4 rounded-lg border border-dashed border-default/60 p-6">
                            <UIcon name="i-lucide-layout-dashboard" class="h-10 w-10 text-default-400" />
                            <div>
                                <p class="text-lg font-medium">You don't have any domains yet</p>
                                <p class="text-sm text-default-500 mt-1">
                                    Add a domain to start tracking DDNS updates and managing records from the dashboard.
                                </p>
                            </div>
                            <UButton to="/domains" icon="i-lucide-plus">Add your first domain</UButton>
                        </div>
                    </template>
                </UCard>
            </div>
        </template>

    </UDashboardPanel>
</template>
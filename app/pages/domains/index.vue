<script setup lang="ts">
import type { GetDomainsResponse } from '~/api-client';
import { DomainStore } from '~/utils/stores/domainStore';

useSeoMeta({
    title: 'Domains | NowIP',
    description: 'Manage your domains'
});

type Domain = GetDomainsResponse["data"][0];

const domains = await DomainStore.use();

const searchQuery = ref('');

const sortedDomains = computed(() => {
    return [...domains].sort((a, b) => getFullDomain(a.subdomain).localeCompare(getFullDomain(b.subdomain)));
});

const filteredDomains = computed(() => {
    const term = searchQuery.value.trim().toLowerCase();
    if (!term) {
        return sortedDomains.value;
    }

    return sortedDomains.value.filter((domain) => {
        const fullDomain = getFullDomain(domain.subdomain).toLowerCase();
        return fullDomain.includes(term) || String(domain.id).includes(term);
    });
});

const domainStats = computed(() => {
    const total = sortedDomains.value.length;
    const reachable = sortedDomains.value.filter((domain) => domain.last_ipv4 || domain.last_ipv6).length;
    const awaiting = sortedDomains.value.filter((domain) => !domain.last_ddns_update).length;

    return {
        total,
        reachable,
        awaiting,
        readyPercentage: total === 0 ? 0 : Math.round((reachable / total) * 100)
    };
});

const statCards = computed(() => [
    {
        label: 'Total domains',
        icon: 'i-lucide-globe-2',
        value: domainStats.value.total,
        description: 'Subdomains connected to your account.'
    },
    {
        label: 'Live connections',
        icon: 'i-lucide-activity',
        value: domainStats.value.reachable,
        description: `${domainStats.value.readyPercentage}% reporting IPv4/IPv6`,
    },
    {
        label: 'Awaiting updates',
        icon: 'i-lucide-timer-reset',
        value: domainStats.value.awaiting,
        description: 'No DDNS check-ins yet.'
    }
]);

const hasDomains = computed(() => domainStats.value.total > 0);

const formatTimestamp = (value?: number | null) => {
    if (!value) {
        return 'Never updated';
    }

    return new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const domainStatus = (domain: Domain) => {
    if (domain.last_ipv4 || domain.last_ipv6) {
        return { label: 'Live', color: 'primary', variant: 'soft' as const };
    }

    if (domain.last_ddns_update) {
        return { label: 'Updating', color: 'yellow', variant: 'soft' as const };
    }

    return { label: 'Awaiting update', color: 'gray', variant: 'subtle' as const };
};

</script>

<template>
    <UDashboardPanel id="domains" :ui="{ body: 'lg:py-12' }">
        <template #header>
            <UDashboardNavbar title="Domains">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>

                <template #actions>
                    <UButton to="/domains?intent=create" icon="i-lucide-plus" color="primary">Add domain</UButton>
                </template>
            </UDashboardNavbar>
        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-6xl mx-auto">
                <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <UCard v-for="stat in statCards" :key="stat.label"
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
                </section>

                <UAlert v-if="domainStats.awaiting && hasDomains" color="warning" icon="i-lucide-alert-triangle"
                    :title="`${domainStats.awaiting} domain${domainStats.awaiting === 1 ? '' : 's'} waiting for DDNS`"
                    description="No updates have been received yet. Make sure your agent is configured.">
                    <template #actions>
                        <UButton to="/domains" size="xs" variant="subtle">View setup guide</UButton>
                    </template>
                </UAlert>

                <section class="flex flex-col gap-4">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p class="text-base font-semibold">Your domains</p>
                            <p class="text-sm text-default-500">Search, inspect, and jump into DNS management.</p>
                        </div>
                        <UInput v-model="searchQuery" icon="i-lucide-search" size="lg" placeholder="Search by name or ID"
                            class="sm:w-72" />
                    </div>

                    <div v-if="!hasDomains" class="rounded-2xl border border-dashed border-default/60 p-8 text-center">
                        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UIcon name="i-lucide-globe" class="h-6 w-6" />
                        </div>
                        <p class="mt-4 text-lg font-semibold">No domains yet</p>
                        <p class="mt-2 text-sm text-default-500">Add your first domain to start serving DNS records.</p>
                        <div class="mt-6">
                            <UButton to="/domains?intent=create" icon="i-lucide-plus" color="primary">Add domain</UButton>
                        </div>
                    </div>

                    <div v-else>
                        <div v-if="filteredDomains.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <UCard v-for="domain in filteredDomains" :key="domain.id"
                                class="h-full border border-default/40 flex flex-col">
                                <template #header>
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <p class="text-sm text-default-500">Domain</p>
                                            <p class="text-lg font-semibold tracking-tight">
                                                {{ getFullDomain(domain.subdomain) }}
                                            </p>
                                        </div>
                                        <UBadge v-bind="domainStatus(domain) as any" size="sm">{{ domainStatus(domain).label }}</UBadge>
                                    </div>
                                </template>

                                <template #default>
                                    <dl class="space-y-3 text-sm">
                                        <div class="flex items-center justify-between gap-4">
                                            <dt class="text-default-500">IPv4</dt>
                                            <dd class="font-medium">{{ domain.last_ipv4 || '—' }}</dd>
                                        </div>
                                        <div class="flex items-center justify-between gap-4">
                                            <dt class="text-default-500">IPv6</dt>
                                            <dd class="font-medium">{{ domain.last_ipv6 || '—' }}</dd>
                                        </div>
                                        <div class="flex items-center justify-between gap-4">
                                            <dt class="text-default-500">Last update</dt>
                                            <dd class="font-medium">{{ formatTimestamp(domain.last_ddns_update) }}</dd>
                                        </div>
                                    </dl>
                                </template>

                                <template #footer>
                                    <div class="flex flex-wrap gap-2">
                                        <UButton :to="`/domains/${domain.id}`" icon="i-lucide-globe" color="primary"
                                            class="flex-1">Open</UButton>
                                        <UButton :to="`/domains/${domain.id}/dns-records`" icon="i-lucide-list" variant="ghost"
                                            class="flex-1">DNS records</UButton>
                                    </div>
                                </template>
                            </UCard>
                        </div>

                        <div v-else class="rounded-2xl border border-default/50 p-8 text-center">
                            <p class="text-base font-semibold">No results</p>
                            <p class="mt-2 text-sm text-default-500">Try a different search term or reset the filter.</p>
                            <div class="mt-4">
                                <UButton variant="ghost" icon="i-lucide-rotate-ccw" @click="searchQuery = ''">Clear
                                    search</UButton>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </template>
    </UDashboardPanel>
</template>
<script setup lang="ts">

useSeoMeta({
    title: 'Dashboard | NowIP',
    description: 'NowIP Dashboard'
});

navigateTo('/domains', { replace: true });

// const data = await useAPI().getDomains({});

</script>

<template>
    <!-- <UDashboardPanel id="home">
        <template #header>
            <UDashboardNavbar title="Dashboard" :ui="{ right: 'gap-3' }">
                <template #leading>
                    <UDashboardSidebarCollapse />
                </template>
            </UDashboardNavbar>

        </template>

        <template #body>
            <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
                {{ data }}
            </div>
        </template>

    </UDashboardPanel> -->
</template>
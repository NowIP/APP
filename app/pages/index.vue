<script setup lang="ts">

definePageMeta({
    title: 'Home',
    meta: [
        { name: 'description', content: 'Welcome to Nuxt 4' }
    ]
});

const data = await useAPI().getDomains({});

</script>

<template>
    <h1>Welcome to Nuxt 4!</h1>
    <pre>{{ data }}</pre>
</template>


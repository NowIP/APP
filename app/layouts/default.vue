<script setup lang="ts">
import Footer from '~/components/layout/Footer.vue';
import Header from '~/components/layout/Header.vue';


</script>

<template>
    <Header />

    <UMain>
        <slot />
    </UMain>

    <Footer />

</template>

<style scoped>

</style>
<script setup lang="ts">

</script>

<template>
    <UMain class="auth-layout">
        <div class="auth-slot">
            <slot />
        </div>
    </UMain>
</template>

<style scoped>

.auth-layout {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin-top: -2rem;
}

.auth-slot {
    width: 100%;
}
</style>
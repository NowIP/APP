<script setup lang="ts">
defineProps<{
    error: {
        statusCode: number;
        statusMessage?: string;
        message?: string;
    };
}>();
</script>

<template>
    <UError :error="error" />
</template>

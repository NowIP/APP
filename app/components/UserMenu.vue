<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
	collapsed?: boolean
}>()

const toast = useToast()

const userinfo = await SessionStore.useUserInfo()

const user = ref({
	name: userinfo.username,
	avatar: {
		alt: userinfo.username
	}
})

async function logout() {
	try {
		const result = await useAPI().postAuthLogout({});

		SessionStore.clearUserInfo();

		useCookie("session_token").value = null;

		if (!result.success) {
			toast.add({
				title: 'Error',
				description: result.message || 'An error occurred during logout.',
				icon: 'i-lucide-alert-circle',
				color: 'error'
			})
			return;
		}

		toast.add({
			title: 'Logged out',
			description: 'You have been successfully logged out.',
			icon: 'i-lucide-check',
			color: 'success'
		})

		await navigateTo('/auth/login');

	} catch (error) {
		toast.add({
			title: 'Error',
			description: 'An unexpected error occurred during logout.',
			icon: 'i-lucide-alert-circle',
			color: 'error'
		})
	}
}

const items = computed<DropdownMenuItem[][]>(() => ([[{
	type: 'label',
	label: user.value.name,
	avatar: user.value.avatar
}], [{
	label: 'Settings',
	icon: 'i-lucide-settings',
	to: '/settings'
}], [{
	label: 'Source Code',
	icon: 'i-simple-icons-github',
	to: 'https://git.leicraftmc.de/NowIP/App',
	target: '_blank'
}, {
	label: 'Log out',
	icon: 'i-lucide-log-out',
	onSelect: logout
}]]))


</script>

<template>
	<UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
		:ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
		<UButton v-bind="{
			...user,
			label: collapsed ? undefined : user?.name,
			trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
		}" color="neutral" variant="ghost" block :square="collapsed" class="data-[state=open]:bg-elevated" :ui="{
		trailingIcon: 'text-dimmed'
	}" />

		<template #chip-leading="{ item }">
			<div class="inline-flex items-center justify-center shrink-0 size-5">
				<span class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2" :style="{
					'--chip-light': `var(--color-${(item as any).chip}-500)`,
					'--chip-dark': `var(--color-${(item as any).chip}-400)`
				}" />
			</div>
		</template>
	</UDropdownMenu>
</template>

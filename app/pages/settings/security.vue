<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast();

const passwordSchema = z.object({
	current_password: z.string(),
	new_password: z.string().min(8, 'Must be at least 8 characters')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
	current_password: undefined,
	new_password: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
	const errors: FormError[] = []
	if (state.current_password && state.new_password && state.current_password === state.new_password) {
		errors.push({ name: 'new_password', message: 'Passwords must be different' })
	}
	return errors
}

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {

	try {
		const result = await useAPI().putAccountPassword({
			body: event.data,
			ignoreResponseError: true
		});

		if (result.success) {
			toast.add({
				title: 'Password updated',
				description: 'Your password has been successfully updated.',
				icon: 'i-lucide-check',
				color: 'success'
			});

			SessionStore.clearUserInfo();

			useCookie("session_token").value = null;

			// Redirect to login page
			navigateTo('/auth/login');

		} else {
			toast.add({
				title: 'Error',
				description: result.message || 'An error occurred while updating your password.',
				icon: 'i-lucide-alert-circle',
				color: 'error'
			})
		}
	} catch (error) {
		toast.add({
			title: 'Error',
			description: 'An unexpected error occurred.',
			icon: 'i-lucide-alert-circle',
			color: 'error'
		})
	}
}

</script>

<template>
	<UPageCard title="Password" description="Confirm your current password before setting a new one." variant="subtle">
		<UForm :schema="passwordSchema" :state="password" :validate="validate" @submit="onSubmit" class="flex flex-col gap-4 max-w-xs">
			<UFormField name="current_password">
				<UInput v-model="password.current_password" type="password" placeholder="Current password" class="w-full" />
			</UFormField>

			<UFormField name="new_password">
				<UInput v-model="password.new_password" type="password" placeholder="New password" class="w-full" />
			</UFormField>

			<UButton label="Update" class="w-fit" type="submit" />
		</UForm>
	</UPageCard>

	<UPageCard title="Account"
		description="No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently."
		class="from-error/10 from-5% to-default">
		<template #footer>
			<UButton label="Delete account" color="error" />
		</template>
	</UPageCard>
</template>

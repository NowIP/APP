<script setup lang="ts">
import * as z from 'zod'
import type { FormError } from '@nuxt/ui'
import type { FormSubmitEvent } from '@nuxt/ui'
import { UserStore } from '~/utils/stores/userStore';

const toast = useToast();

const passwordSchema = z.object({
	current_password: z.string('Current Password is required').trim().min(1, 'Current Password is required'),
	new_password: z.string('Password is required').trim()
		.min(8, 'Must be at least 8 characters')
        .max(50, 'Must be at most 50 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[\W_]/, 'Must contain at least one special character'),
    confirm_password: z.string('Confirm Password is required').trim().min(1, 'Confirm Password is required')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<Partial<PasswordSchema>>({
	current_password: undefined,
	new_password: undefined,
	confirm_password: undefined
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
	const errors: FormError[] = []
	if (state.current_password && state.new_password && state.current_password === state.new_password) {
		errors.push({ name: 'new_password', message: 'Passwords must be different' })
	}
	if (state.new_password && state.confirm_password && state.new_password !== state.confirm_password) {
		errors.push({ name: 'confirm_password', message: 'Passwords do not match' })
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

			UserStore.clear();

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

const deleteAccountOpen = ref(false);
const deletingAccount = ref(false);

async function handleDeleteAccount() {
	deletingAccount.value = true;
	try {
		const result = await useAPI().deleteAccount({
			ignoreResponseError: true
		});

		if (result.success) {
			UserStore.clear();
			useCookie("session_token").value = null;

			toast.add({
				title: 'Account deleted',
				description: 'Your account has been permanently deleted.',
				icon: 'i-lucide-check',
				color: 'success'
			});

			navigateTo('/auth/login');
		} else {
			toast.add({
				title: 'Error',
				description: result.message || 'An error occurred while deleting your account.',
				icon: 'i-lucide-alert-circle',
				color: 'error'
			});
		}
	} catch (error) {
		toast.add({
			title: 'Error',
			description: 'An unexpected error occurred.',
			icon: 'i-lucide-alert-circle',
			color: 'error'
		});
	} finally {
		deletingAccount.value = false;
		deleteAccountOpen.value = false;
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

			<UFormField name="confirm_password">
				<UInput v-model="password.confirm_password" type="password" placeholder="Confirm new password" class="w-full" />
			</UFormField>

			<UButton label="Update" class="w-fit" type="submit" />
		</UForm>
	</UPageCard>

	<UPageCard title="Account"
		description="No longer want to use our service? You can delete your account here. This action is not reversible. All information related to this account will be deleted permanently."
		class="from-error/10 from-5% to-default">
		<template #footer>
			<UModal v-model:open="deleteAccountOpen">
				<UButton label="Delete account" color="error" />

				<template #content>
					<UCard>
						<template #header>
							<div class="flex items-center gap-2">
								<UIcon name="i-lucide-alert-triangle" class="text-error h-5 w-5" />
								<h3 class="text-lg font-semibold">Delete Account</h3>
							</div>
						</template>

						<p class="text-sm text-default-600">
							Are you sure you want to delete your account? This action is permanent and cannot be undone.
							All your domains, DNS records, and settings will be permanently deleted.
						</p>

						<template #footer>
							<div class="flex justify-end gap-2">
								<UButton label="Cancel" color="neutral" variant="ghost" @click="deleteAccountOpen = false" />
								<UButton 
									label="Delete permanently" 
									color="error" 
									:loading="deletingAccount"
									@click="handleDeleteAccount" 
								/>
							</div>
						</template>
					</UCard>
				</template>
			</UModal>
		</template>
	</UPageCard>
</template>

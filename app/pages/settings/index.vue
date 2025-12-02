<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { UserStore } from '../../utils/stores/userStore';

const fileRef = ref<HTMLInputElement>()

const profileSchema = z.object({
	username: z.string().trim()
		.min(5, 'Must be at least 5 characters')
        .max(30, 'Must be at most 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric characters and underscores are allowed'),
	email: z.email('Invalid email').trim(),
})

const userInfo = await UserStore.use();

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
	username: userInfo.username,
	email: userInfo.email,
});

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {

	try {
		const result = await useAPI((api) => api.putAccount({
			body: event.data
		}));

		if (result.success) {
			toast.add({
				title: 'Profile updated',
				description: 'Your profile has been successfully updated.',
				icon: 'i-lucide-check',
				color: 'success'
			})

			UserStore.set({
				...userInfo,
				username: event.data.username,
				email: event.data.email
			})

		} else {
			toast.add({
				title: 'Error',
				description: result.message || 'An error occurred while updating your profile.',
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
	<UForm id="settings" :schema="profileSchema" :state="profile" @submit="onSubmit">
		<UPageCard title="Profile" description="These informations will be displayed publicly." variant="naked"
			orientation="horizontal" class="mb-4">
			<UButton form="settings" label="Save changes" color="neutral" type="submit" class="w-fit lg:ms-auto" />
		</UPageCard>

		<UPageCard variant="subtle">
			<UFormField name="username" label="Username"
				description="Your unique username for logging in and your profile URL." required
				class="flex max-sm:flex-col justify-between items-start gap-4">
				<UInput v-model="profile.username" type="username" autocomplete="off" />
			</UFormField>
			<USeparator />
			<UFormField name="email" label="Email"
				description="Used to sign in, for email receipts and product updates." required
				class="flex max-sm:flex-col justify-between items-start gap-4">
				<UInput v-model="profile.email" type="email" autocomplete="off" />
			</UFormField>
		</UPageCard>
	</UForm>
</template>

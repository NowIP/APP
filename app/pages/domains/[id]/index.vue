<script setup lang="ts">
import { computed, inject, reactive, ref, watch, type ComputedRef } from 'vue'
import { useClipboard } from '@vueuse/core'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { GetDomainsDomainIdResponse } from '~/api-client'
import { getFullDomain } from '~/composables/getFullDomain'
import { DomainStore } from '~/utils/stores/domainStore'

type Domain = GetDomainsDomainIdResponse['data']

const domain = inject<Domain>('domain')
const domainId = inject<string>('domainId')
const isNewDomain = inject<ComputedRef<boolean>>('isNewDomain')
const refreshDomain = inject<() => Promise<void>>('refreshDomain')

if (!domain || !domainId || !isNewDomain || !refreshDomain) {
	throw new Error('Domain context is missing.');
}

const router = useRouter()
const toast = useToast()
const { copy } = useClipboard()

const runtimeConfig = useRuntimeConfig()
const apiBaseUrl = (runtimeConfig.public.apiUrl || '').replace(/\/$/, '')
const baseDNSDomain = runtimeConfig.public.baseDNSDomain

const domainSchema = z.object({
	subdomain: z.string().trim()
		.min(3, 'Must be at least 3 characters')
		.max(63, 'Must be at most 63 characters')
		.regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, or hyphens only')
		.regex(/^[a-z]/, 'Must start with a letter')
		.regex(/[a-z0-9]$/, 'Must end with a letter or number')
})

type DomainForm = z.output<typeof domainSchema>

const creationState = reactive<DomainForm>({
	subdomain: ''
})
const generalState = reactive<DomainForm>({
	subdomain: domain.subdomain || ''
})

watch(() => domain.subdomain, (value) => {
	generalState.subdomain = value || ''
}, { immediate: true })

const creatingDomain = ref(false)
const savingGeneral = ref(false)

const normalizeSubdomain = (value: string) => value.trim().toLowerCase()

const handleCreate = async (event: FormSubmitEvent<DomainForm>) => {
	if (creatingDomain.value) {
		return
	}

	creatingDomain.value = true

	try {
		const subdomain = normalizeSubdomain(event.data.subdomain)
		const result = await useAPI().postDomains({
			body: { subdomain }
		})

		if (result.success) {
			toast.add({
				title: 'Domain created',
				description: `${getFullDomain(subdomain)} is ready.`,
				icon: 'i-lucide-check',
				color: 'success'
			})

			await DomainStore.fetchAndSet()
			await router.push(`/domains/${result.data.id}`)
			return
		}

		toast.add({
			title: 'Unable to create domain',
			description: result.message || 'Please try again later.',
			icon: 'i-lucide-alert-triangle',
			color: 'error'
		})
	} catch (error) {
		console.error(error)
		toast.add({
			title: 'Unexpected error',
			description: 'Something went wrong while creating the domain.',
			icon: 'i-lucide-bug',
			color: 'error'
		})
	} finally {
		creatingDomain.value = false
	}
}

const handleGeneralSubmit = async (event: FormSubmitEvent<DomainForm>) => {
	if (savingGeneral.value) {
		return
	}

	savingGeneral.value = true

	try {
		const subdomain = normalizeSubdomain(event.data.subdomain)
		const result = await useAPI().putDomainsDomainId({
			path: { domainID: domainId },
			body: { subdomain }
		})

		if (result.success) {
			toast.add({
				title: 'Domain updated',
				description: 'Subdomain saved successfully.',
				icon: 'i-lucide-check',
				color: 'success'
			})

			await Promise.all([refreshDomain(), DomainStore.fetchAndSet()])
			return
		}

		toast.add({
			title: 'Unable to save changes',
			description: result.message || 'Please try again later.',
			icon: 'i-lucide-alert-triangle',
			color: 'error'
		})
	} catch (error) {
		console.error(error)
		toast.add({
			title: 'Unexpected error',
			description: 'Something went wrong while updating the domain.',
			icon: 'i-lucide-bug',
			color: 'error'
		})
	} finally {
		savingGeneral.value = false
	}
}

const formatTimestamp = (timestamp: number | null) => {
	if (!timestamp || timestamp <= 0) {
		return 'Never'
	}

	const normalized = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
	const date = new Date(normalized)
	if (Number.isNaN(date.getTime())) {
		return 'Unknown'
	}

	return date.toLocaleString(undefined, {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	})
}

const relativeTimestamp = (timestamp: number | null) => {
	if (!timestamp || timestamp <= 0) {
		return null
	}

	const normalized = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
	const diffMs = Date.now() - normalized
	if (diffMs < 60_000) {
		return 'Just now'
	}

	const diffMinutes = Math.round(diffMs / 60_000)
	if (diffMinutes < 60) {
		return `${diffMinutes}m ago`
	}

	const diffHours = Math.round(diffMinutes / 60)
	if (diffHours < 24) {
		return `${diffHours}h ago`
	}

	const diffDays = Math.round(diffHours / 24)
	return `${diffDays}d ago`
}

const fullDomain = computed(() => {
	if (!domain.subdomain) {
		return baseDNSDomain
	}
	return getFullDomain(domain.subdomain)
})

const domainFacts = computed(() => ([
	{
		label: 'Last IPv4',
		value: domain.last_ipv4 || 'Waiting',
		description: domain.last_ipv4 ? 'Reported by your DDNS client' : 'No IPv4 update yet'
	},
	{
		label: 'Last IPv6',
		value: domain.last_ipv6 || 'Waiting',
		description: domain.last_ipv6 ? 'Reported by your DDNS client' : 'No IPv6 update yet'
	},
	{
		label: 'Last DDNS update',
		value: formatTimestamp(domain.last_ddns_update),
		description: relativeTimestamp(domain.last_ddns_update) || 'Waiting for first update'
	},
	{
		label: 'Domain ID',
		value: `#${domain.id || '—'}`,
		description: 'Used as the username for DDNS Basic Auth'
	}
]))

const ddnsEndpoint = computed(() => {
	if (!apiBaseUrl) {
		return ''
	}
	const hostnameParam = encodeURIComponent(fullDomain.value)
	return `${apiBaseUrl}/nic/update?hostname=${hostnameParam}&myip=1.2.3.4`
})

const ddnsCurl = computed(() => {
	if (!apiBaseUrl || !domain.ddnsv2_api_secret || !domain.id) {
		return ''
	}
	return `curl -u "${domain.id}:${domain.ddnsv2_api_secret}" "${apiBaseUrl}/nic/update?hostname=${encodeURIComponent(fullDomain.value)}&myip=1.2.3.4"`
})

const copyValue = async (value: string, label: string) => {
	if (!value) {
		return
	}
	await copy(value)
	toast.add({
		title: `${label} copied`,
		icon: 'i-lucide-clipboard-copy',
		color: 'success'
	})
}

</script>

<template>
	<div class="flex flex-col gap-6 w-full mx-auto">
		<template v-if="isNewDomain">
			<UAlert color="primary" icon="i-lucide-info" title="Create a NowIP domain"
				description="Choose a unique subdomain. We'll generate the DDNS secret after creation." />

			<UForm :schema="domainSchema" :state="creationState" class="space-y-4" @submit="handleCreate">
				<UCard>
					<template #header>
						<div>
							<p class="text-base font-medium">Domain details</p>
							<p class="text-sm text-default-500">Pick the hostname you'll update via DDNS.</p>
						</div>
					</template>

					<UFormField name="subdomain" label="Subdomain" required description="Lowercase letters, numbers and hyphens">
						<div class="flex flex-col gap-2">
							<UInput v-model="creationState.subdomain" placeholder="home-server" autocomplete="off" />
							<p class="text-sm text-default-500">Full domain will be {{ creationState.subdomain ?
								`${creationState.subdomain}.${baseDNSDomain}` : baseDNSDomain }}
							</p>
						</div>
					</UFormField>

					<template #footer>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
							<UButton to="/domains" color="neutral" variant="ghost">Cancel</UButton>
							<UButton type="submit" color="primary" :loading="creatingDomain">
								Create domain
							</UButton>
						</div>
					</template>
				</UCard>
			</UForm>
		</template>

		<template v-else>
			<UCard>
				<template #header>
					<div class="flex flex-col gap-1">
						<p class="text-sm text-default-500">Domain</p>
						<div class="flex flex-wrap items-center gap-3">
							<p class="text-2xl font-semibold break-all">{{ fullDomain }}</p>
							<UButton icon="i-lucide-copy" color="neutral" variant="ghost"
								@click="copyValue(fullDomain, 'Domain hostname')">
								Copy hostname
							</UButton>
						</div>
						<p class="text-sm text-default-500">Manage DDNS activity and DNS settings.</p>
					</div>
				</template>

				<div class="grid gap-4 sm:grid-cols-2">
					<div v-for="fact in domainFacts" :key="fact.label" class="rounded-xl border border-default/40 p-4">
						<p class="text-sm text-default-500">{{ fact.label }}</p>
						<p class="text-xl font-semibold mt-1 break-all">{{ fact.value }}</p>
						<p v-if="fact.description" class="text-xs text-default-500 mt-1">{{ fact.description }}</p>
					</div>
				</div>
			</UCard>

			<UForm :schema="domainSchema" :state="generalState" @submit="handleGeneralSubmit">
				<UCard>
					<template #header>
						<div class="flex flex-col gap-1">
							<p class="text-base font-medium">Subdomain</p>
							<p class="text-sm text-default-500">Updating this value requires reconfiguring your DDNS client.</p>
						</div>
					</template>

					<UFormField name="subdomain" label="Subdomain" required>
						<UInput v-model="generalState.subdomain" autocomplete="off" />
					</UFormField>

					<template #footer>
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
							<span class="text-sm text-default-500">Full domain: {{ generalState.subdomain ?
								`${generalState.subdomain}.${baseDNSDomain}` : baseDNSDomain }}</span>
							<UButton type="submit" color="primary" :loading="savingGeneral">
								Save changes
							</UButton>
						</div>
					</template>
				</UCard>
			</UForm>

			<UCard>
				<template #header>
					<div class="flex flex-col gap-1">
						<p class="text-base font-medium">DDNS credentials</p>
						<p class="text-sm text-default-500">Use these values with any DDNSv2 compatible client.</p>
					</div>
				</template>

				<div class="space-y-4">
					<UFormField label="Domain ID (username)">
						<div class="flex gap-2">
							<UInput :model-value="String(domain.id)" readonly class="flex-1" />
							<UButton icon="i-lucide-copy" variant="ghost" color="neutral"
								@click="copyValue(String(domain.id), 'Domain ID')" />
						</div>
					</UFormField>

					<UFormField label="DDNS secret (password)">
						<div class="flex gap-2">
							<UInput :model-value="domain.ddnsv2_api_secret" readonly class="flex-1" type="password" />
							<UButton icon="i-lucide-copy" variant="ghost" color="neutral"
								@click="copyValue(domain.ddnsv2_api_secret, 'DDNS secret')" />
						</div>
					</UFormField>

					<UFormField label="Update endpoint">
						<div class="flex gap-2">
							<UInput :model-value="ddnsEndpoint" readonly class="flex-1" />
							<UButton icon="i-lucide-copy" variant="ghost" color="neutral"
								@click="copyValue(ddnsEndpoint, 'DDNS endpoint')" />
						</div>
					</UFormField>

					<UAlert color="neutral" icon="i-lucide-terminal" title="Example curl command"
						:description="ddnsCurl || 'Provide the credentials above to your DDNS client.'">
						<template v-if="ddnsCurl" #description>
							<div class="space-y-2">
								<p>Run this manually or adapt it for cron/automation:</p>
								<pre class="rounded-lg bg-default-100 p-3 overflow-x-auto text-xs">{{ ddnsCurl }}</pre>
							</div>
						</template>
					</UAlert>
				</div>
			</UCard>
		</template>
	</div>
</template>

<script setup lang="ts">
import { inject, ref, type ComputedRef } from 'vue'
import type { GetDomainsDomainIdResponse } from '~/api-client'
import { getFullDomain } from '~/composables/getFullDomain'
import { DomainStore } from '~/utils/stores/domainStore'

type Domain = GetDomainsDomainIdResponse['data']

const domain = inject<Domain>('domain')
const domainId = inject<string>('domainId')
const isNewDomain = inject<ComputedRef<boolean>>('isNewDomain')

if (!domain || !domainId || !isNewDomain) {
    throw new Error('Domain context is missing.')
}

// Redirect to domain list if this is a new domain
if (isNewDomain.value) {
    navigateTo('/domains')
}

const router = useRouter()
const toast = useToast()

const deleteOpen = ref(false)
const deletingDomain = ref(false)
const confirmationText = ref('')

const fullDomain = computed(() => getFullDomain(domain.subdomain))

const canDelete = computed(() => confirmationText.value === domain.subdomain)

async function handleDeleteDomain() {
    if (!canDelete.value || deletingDomain.value) {
        return
    }

    deletingDomain.value = true
    try {
        const result = await useAPI().deleteDomainsDomainId({
            path: { domainID: domainId },
            ignoreResponseError: true
        })

        if (result.success) {
            toast.add({
                title: 'Domain deleted',
                description: `${fullDomain.value} has been permanently deleted.`,
                icon: 'i-lucide-check',
                color: 'success'
            })

            await DomainStore.fetchAndSet()
            router.push('/domains')
        } else {
            toast.add({
                title: 'Unable to delete domain',
                description: result.message || 'Please try again later.',
                icon: 'i-lucide-alert-triangle',
                color: 'error'
            })
        }
    } catch (error) {
        console.error(error)
        toast.add({
            title: 'Unexpected error',
            description: 'Something went wrong while deleting the domain.',
            icon: 'i-lucide-bug',
            color: 'error'
        })
    } finally {
        deletingDomain.value = false
        deleteOpen.value = false
        confirmationText.value = ''
    }
}
</script>

<template>
    <UCard class="border-error/30 bg-error/5">
        <template #header>
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-alert-triangle" class="text-error h-6 w-6" />
                <div>
                    <p class="text-lg font-semibold text-error">Danger Zone</p>
                    <p class="text-sm text-default-500">Irreversible and destructive actions</p>
                </div>
            </div>
        </template>

        <div class="space-y-4">
            <div class="rounded-lg border border-error/30 p-4">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p class="font-medium">Delete this domain</p>
                        <p class="text-sm text-default-500">
                            Once deleted, all DNS records and DDNS configurations will be permanently removed.
                        </p>
                    </div>
                    <UModal v-model:open="deleteOpen">
                        <UButton label="Delete domain" color="error" variant="soft" />

                        <template #content>
                            <UCard>
                                <template #header>
                                    <div class="flex items-center gap-2">
                                        <UIcon name="i-lucide-alert-triangle" class="text-error h-5 w-5" />
                                        <h3 class="text-lg font-semibold">Delete Domain</h3>
                                    </div>
                                </template>

                                <div class="space-y-4">
                                    <p class="text-sm text-default-600">
                                        Are you sure you want to delete <strong>{{ fullDomain }}</strong>?
                                        This action is permanent and cannot be undone.
                                    </p>

                                    <div>
                                        <label class="text-sm text-default-600">
                                            Type <strong>{{ domain.subdomain }}</strong> to confirm:
                                        </label>
                                        <UInput v-model="confirmationText" class="mt-2" placeholder="Enter subdomain" />
                                    </div>
                                </div>

                                <template #footer>
                                    <div class="flex justify-end gap-2">
                                        <UButton 
                                            label="Cancel" 
                                            color="neutral" 
                                            variant="ghost" 
                                            @click="deleteOpen = false; confirmationText = ''" 
                                        />
                                        <UButton
                                            label="Delete permanently"
                                            color="error"
                                            :disabled="!canDelete"
                                            :loading="deletingDomain"
                                            @click="handleDeleteDomain"
                                        />
                                    </div>
                                </template>
                            </UCard>
                        </template>
                    </UModal>
                </div>
            </div>
        </div>
    </UCard>
</template>
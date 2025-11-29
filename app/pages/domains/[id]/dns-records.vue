<script setup lang="ts">
import { computed, h, inject, reactive, ref, resolveComponent, watch, type ComputedRef } from 'vue'
import { useClipboard } from '@vueuse/core'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { GetDomainsDomainIdRecordsResponse, GetDomainsDomainIdResponse } from '~/api-client'
import { getFullDomain } from '~/composables/getFullDomain'
import { is } from 'zod/locales'

type Domain = GetDomainsDomainIdResponse['data']
type DomainRecord = GetDomainsDomainIdRecordsResponse['data'][number]

const domain = inject<Domain>('domain');
const domainId = inject<string>('domainId');

if (!domain || !domainId) {
    throw new Error('Domain context is missing.')
}

const toast = useToast();
const { copy } = useClipboard();

const runtimeConfig = useRuntimeConfig();
const baseDNSDomain = runtimeConfig.public.baseDNSDomain;

const fullDomain = computed(() => domain.subdomain ? getFullDomain(domain.subdomain) : baseDNSDomain);

const records = ref<DomainRecord[]>([]);
const loadingRecords = ref(false);
const creatingRecord = ref(false);
const deletingRecordId = ref<number | null>(null);

const recordTypeOptions = ['A', 'AAAA', 'CNAME', 'MX', 'SRV', 'TXT', 'SPF', 'CAA'] as const;

const recordSchema = z.object({
    subdomain: z.string().trim().min(1, 'Required'),
    type: z.enum(recordTypeOptions),
    value: z.string().trim().min(1, 'Required')
});

type RecordForm = z.output<typeof recordSchema>;

const recordState = reactive<RecordForm>({
    subdomain: '@',
    type: 'A',
    value: ''
});

const normalizeSubdomain = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    return trimmed || '@'
};

const formatHost = (value: string) => {
    if (value === '@' || !value) {
        return fullDomain.value
    }
    return `${value}.${fullDomain.value}`
};

const stringifyRecordData = (data: DomainRecord['record_data']) => {
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return String(data)
    }

    if (data === null || typeof data === 'undefined') {
        return ''
    }

    try {
        return JSON.stringify(data)
    } catch {
        return ''
    }
};

const fetchRecords = async () => {
    loadingRecords.value = true
    try {
        const result = await useAPI().getDomainsDomainIdRecords({
            path: { domainID: domainId }
        })

        if (result.success) {
            records.value = result.data
            return
        }

        toast.add({
            title: 'Unable to load records',
            description: result.message || 'Try again later.',
            icon: 'i-lucide-alert-triangle',
            color: 'error'
        })
    } catch (error) {
        console.error(error)
        toast.add({
            title: 'Unexpected error',
            description: 'Something went wrong while loading the records.',
            icon: 'i-lucide-bug',
            color: 'error'
        })
    } finally {
        loadingRecords.value = false
    }
};


await fetchRecords()

const handleRecordSubmit = async (event: FormSubmitEvent<RecordForm>) => {
    if (creatingRecord.value) {
        return
    }

    creatingRecord.value = true
    try {
        const payload = {
            subdomain: normalizeSubdomain(event.data.subdomain),
            type: event.data.type,
            record_data: event.data.value.trim()
        }

        const result = await useAPI().postDomainsDomainIdRecords({
            path: { domainID: domainId },
            body: payload
        })

        if (result.success) {
            toast.add({
                title: 'Record added',
                description: `${payload.type} → ${formatHost(payload.subdomain)}`,
                icon: 'i-lucide-check',
                color: 'success'
            })

            recordState.subdomain = '@'
            recordState.type = 'A'
            recordState.value = ''
            await fetchRecords()
            return
        }

        toast.add({
            title: 'Unable to add record',
            description: result.message || 'Try again later.',
            icon: 'i-lucide-alert-triangle',
            color: 'error'
        })
    } catch (error) {
        console.error(error)
        toast.add({
            title: 'Unexpected error',
            description: 'Something went wrong while creating the record.',
            icon: 'i-lucide-bug',
            color: 'error'
        })
    } finally {
        creatingRecord.value = false
    }
};

const deleteRecord = async (recordId: number) => {
    if (deletingRecordId.value === recordId) {
        return
    }

    deletingRecordId.value = recordId
    try {
        const result = await useAPI().deleteDomainsDomainIdRecordsRecordId({
            path: {
                domainID: domainId,
                recordID: String(recordId)
            }
        })

        if (result.success) {
            toast.add({
                title: 'Record removed',
                icon: 'i-lucide-check',
                color: 'success'
            })

            await fetchRecords()
            return
        }

        toast.add({
            title: 'Unable to remove record',
            description: result.message || 'Try again later.',
            icon: 'i-lucide-alert-triangle',
            color: 'error'
        })
    } catch (error) {
        console.error(error)
        toast.add({
            title: 'Unexpected error',
            description: 'Something went wrong while removing the record.',
            icon: 'i-lucide-bug',
            color: 'error'
        })
    } finally {
        deletingRecordId.value = null
    }
};

const copyRecord = async (record: DomainRecord) => {
    const value = `${record.type} ${formatHost(record.subdomain)} ${stringifyRecordData(record.record_data)}`.trim()
    await copy(value)
    toast.add({
        title: 'Record copied',
        icon: 'i-lucide-clipboard-copy',
        color: 'success'
    })
};

const columns: TableColumn<DomainRecord>[] = (() => {
    const UBadge = resolveComponent('UBadge')
    const UButton = resolveComponent('UButton')

    return [
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) => h(UBadge, { variant: 'subtle', color: 'neutral' }, () => row.getValue('type'))
        },
        {
            id: 'host',
            header: 'Host',
            cell: ({ row }) => formatHost(row.original.subdomain)
        },
        {
            id: 'value',
            header: 'Value',
            cell: ({ row }) => stringifyRecordData(row.original.record_data)
        },
        {
            accessorKey: 'id',
            header: '#',
            cell: ({ row }) => `#${row.original.id}`
        },
        {
            id: 'actions',
            header: '',
            enableSorting: false,
            cell: ({ row }) => h('div', { class: 'flex justify-end gap-2' }, [
                h(UButton, {
                    icon: 'i-lucide-copy',
                    variant: 'ghost',
                    color: 'neutral',
                    'aria-label': 'Copy record',
                    onClick: () => copyRecord(row.original)
                }),
                h(UButton, {
                    icon: 'i-lucide-trash-2',
                    color: 'error',
                    variant: 'ghost',
                    loading: deletingRecordId.value === row.original.id,
                    'aria-label': 'Delete record',
                    onClick: () => deleteRecord(row.original.id)
                })
            ])
        }
    ]
})();

const hasRecords = computed(() => records.value.length > 0);

</script>

<template>
    <div class="flex flex-col gap-6 w-full mx-auto">
        <template>
            <UCard>
                <template #header>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p class="text-base font-medium">Additional DNS records</p>
                            <p class="text-sm text-default-500">
                                These records are served in addition to the automatic A/AAAA updates.
                            </p>
                        </div>
                        <UButton variant="ghost" icon="i-lucide-rotate-ccw" :loading="loadingRecords" @click="fetchRecords">
                            Refresh
                        </UButton>
                    </div>
                </template>

                <div v-if="loadingRecords" class="py-12 text-center text-sm text-default-500">
                    Loading records...
                </div>

                <div v-else-if="!hasRecords"
                    class="rounded-lg border border-dashed border-default/60 p-6 text-sm text-default-500">
                    No custom records yet. Use the form below to add MX, TXT, or service-specific entries.
                </div>

                <UTable v-else :data="records" :columns="columns" class="flex-1" />
            </UCard>

            <UForm :schema="recordSchema" :state="recordState" @submit="handleRecordSubmit">
                <UCard>
                    <template #header>
                        <div class="flex flex-col gap-1">
                            <p class="text-base font-medium">Add record</p>
                            <p class="text-sm text-default-500">Use @ for the root hostname.</p>
                        </div>
                    </template>

                    <div class="grid gap-4 md:grid-cols-3">
                        <UFormField name="subdomain" label="Host" class="md:col-span-1" required>
                            <UInput v-model="recordState.subdomain" placeholder="@" />
                        </UFormField>

                        <UFormField name="type" label="Type" class="md:col-span-1" required>
                            <USelect v-model="recordState.type" :options="recordTypeOptions" />
                        </UFormField>

                        <UFormField name="value" label="Value" class="md:col-span-3" required>
                            <UTextarea v-model="recordState.value" :rows="3" placeholder="Target, text, or JSON payload" />
                        </UFormField>
                    </div>

                    <template #footer>
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <UButton type="submit" color="primary" :loading="creatingRecord">
                                Create record
                            </UButton>
                        </div>
                    </template>
                </UCard>
            </UForm>
        </template>
    </div>
</template>


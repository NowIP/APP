<script setup lang="ts">
import { computed, h, inject, reactive, ref, resolveComponent, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type {
    GetDomainsDomainIdRecordsResponse,
    GetDomainsDomainIdResponse,
    PostDomainsDomainIdRecordsData
} from '~/api-client'
import { getFullDomain } from '~/composables/getFullDomain'
import { DNSRecordDataSchemas, DNSRecordDataSchemasNames } from '~/utils/dns-utils'

type Domain = GetDomainsDomainIdResponse['data']
type DomainRecord = GetDomainsDomainIdRecordsResponse['data'][number]
type RecordPayload = NonNullable<PostDomainsDomainIdRecordsData['body']>
type RecordType = (typeof DNSRecordDataSchemasNames)[number]

const domain = inject<Domain>('domain')
const domainId = inject<string>('domainId')

if (!domain || !domainId) {
    throw new Error('Domain context is missing.')
}

const api = useAPI()
const toast = useToast()
const { copy } = useClipboard()

const runtimeConfig = useRuntimeConfig()
const baseDNSDomain = runtimeConfig.public.baseDNSDomain

const fullDomain = computed(() =>
    domain.subdomain ? getFullDomain(domain.subdomain) : baseDNSDomain
)

const records = ref<DomainRecord[]>([])
const loadingRecords = ref(false)
const loadError = ref<string | null>(null)
const creatingRecord = ref(false)
const deletingRecordId = ref<number | null>(null)
const lastLoadedAt = ref<number | null>(null)

const recordTypeDefinitions = [
    { value: 'A', label: 'A · IPv4', helper: 'Map hostnames to IPv4 addresses.' },
    { value: 'AAAA', label: 'AAAA · IPv6', helper: 'Map hostnames to IPv6 addresses.' },
    { value: 'CNAME', label: 'CNAME · Alias', helper: 'Alias a hostname to another fully qualified name.' },
    { value: 'MX', label: 'MX · Mail', helper: 'Route inbound mail to a mail exchanger.' },
    { value: 'SRV', label: 'SRV · Service', helper: 'Advertise custom services with host, port, and priority.' },
    { value: 'TXT', label: 'TXT · Text', helper: 'Publish arbitrary text (SPF, DKIM, verification codes).' },
    { value: 'SPF', label: 'SPF · Sender Policy', helper: 'Dedicated SPF helper for legacy consumers.' },
    { value: 'CAA', label: 'CAA · Certificate', helper: 'Control which certificate authorities may issue for this domain.' }
] as const satisfies ReadonlyArray<{ value: RecordType; label: string; helper: string }>

const recordTypeValues = DNSRecordDataSchemasNames as [RecordType, ...RecordType[]]
const recordTypeOptions = recordTypeValues
const recordTypeEnum = z.enum(recordTypeValues)

const emptySpecificFields = () => ({
    address: '',
    domain: '',
    exchange: '',
    priority: '',
    weight: '',
    port: '',
    target: '',
    textData: '',
    flags: '',
    tag: '',
    value: ''
})

const schemaFieldToFormField: Record<string, string> = {
    address: 'address',
    domain: 'domain',
    exchange: 'exchange',
    priority: 'priority',
    weight: 'weight',
    port: 'port',
    target: 'target',
    data: 'textData',
    flags: 'flags',
    tag: 'tag',
    value: 'value',
    ttl: 'ttl'
}

const recordSchema = z
    .object({
        subdomain: z.string().trim().min(1, 'Required'),
        type: recordTypeEnum,
        ttl: z.string().optional(),
        address: z.string().optional(),
        domain: z.string().optional(),
        exchange: z.string().optional(),
        priority: z.string().optional(),
        weight: z.string().optional(),
        port: z.string().optional(),
        target: z.string().optional(),
        textData: z.string().optional(),
        flags: z.string().optional(),
        tag: z.string().optional(),
        value: z.string().optional()
    })
    .superRefine((values, ctx) => {
        const require = (field: string, message: string) => {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [field],
                message
            })
        }

        if (values.ttl?.trim()) {
            const ttlValue = Number(values.ttl)
            if (Number.isNaN(ttlValue)) {
                require('ttl', 'TTL must be numeric')
            } else if (ttlValue < 0 || ttlValue > 86400) {
                require('ttl', 'TTL must be between 0 and 86400 seconds')
            }
        }

        switch (values.type) {
            case 'A':
            case 'AAAA':
                if (!values.address?.trim()) {
                    require('address', values.type === 'A' ? 'IPv4 address required' : 'IPv6 address required')
                }
                break
            case 'CNAME':
                if (!values.domain?.trim()) {
                    require('domain', 'Target hostname required')
                }
                break
            case 'MX':
                if (!values.exchange?.trim()) {
                    require('exchange', 'Mail exchanger required')
                }
                if (!values.priority?.trim()) {
                    require('priority', 'Priority required')
                } else if (Number.isNaN(Number(values.priority))) {
                    require('priority', 'Priority must be numeric')
                }
                break
            case 'SRV':
                if (!values.target?.trim()) {
                    require('target', 'Target hostname required')
                }
                ;(['priority', 'weight', 'port'] as const).forEach((field) => {
                    const rawValue = values[field]
                    if (!rawValue?.trim()) {
                        require(field, 'Required')
                    } else if (Number.isNaN(Number(rawValue))) {
                        require(field, 'Must be numeric')
                    }
                })
                break
            case 'TXT':
            case 'SPF':
                if (!values.textData?.trim()) {
                    require('textData', 'Text payload required')
                }
                break
            case 'CAA':
                if (!values.tag?.trim()) {
                    require('tag', 'Tag required')
                }
                if (!values.value?.trim()) {
                    require('value', 'Value required')
                }
                if (!values.flags?.trim()) {
                    require('flags', 'Flags required')
                } else if (Number.isNaN(Number(values.flags))) {
                    require('flags', 'Flags must be numeric')
                }
                break
        }

        try {
            buildPayload(values as RecordForm)
        } catch (error) {
            if (error instanceof z.ZodError) {
                error.issues.forEach((issue) => {
                    const rawPath = issue.path.at(-1)
                    if (typeof rawPath !== 'string') {
                        return
                    }
                    const formField = schemaFieldToFormField[rawPath]
                    if (!formField) {
                        return
                    }

                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [formField],
                        message: issue.message
                    })
                })
            }
        }
    })

type RecordForm = z.output<typeof recordSchema>

const recordState = reactive<RecordForm>({
    subdomain: '@',
    type: 'A',
    ttl: '',
    ...emptySpecificFields()
})

const recordTypeHelper = computed(
    () => recordTypeDefinitions.find((definition) => definition.value === recordState.type)?.helper ?? ''
)

const clearSpecificFields = () => {
    Object.assign(recordState, emptySpecificFields())
}

watch(
    () => recordState.type,
    () => {
        clearSpecificFields()
        recordState.ttl = ''
    }
)

const normalizeSubdomain = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    return trimmed || '@'
}

const formatHost = (value: string) => {
    if (value === '@' || !value) {
        return fullDomain.value
    }
    return `${value}.${fullDomain.value}`
}

const parseNumberField = (value?: string) => {
    if (!value?.trim()) {
        return undefined
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

const toTextPayload = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
        return ''
    }
    const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    if (lines.length <= 1) {
        return lines[0] ?? ''
    }
    return lines
}

const buildRecordData = (form: RecordForm) => {
    const ttl = parseNumberField(form.ttl)
    const applyTTL = <T extends Record<string, unknown>>(data: T) =>
        typeof ttl === 'number' ? { ...data, ttl } : data

    switch (form.type) {
        case 'A':
            return applyTTL({ address: form.address!.trim() })
        case 'AAAA':
            return applyTTL({ address: form.address!.trim() })
        case 'CNAME':
            return applyTTL({ domain: form.domain!.trim() })
        case 'MX':
            return applyTTL({
                exchange: form.exchange!.trim(),
                priority: Number(form.priority)
            })
        case 'SRV':
            return applyTTL({
                priority: Number(form.priority),
                weight: Number(form.weight),
                port: Number(form.port),
                target: form.target!.trim()
            })
        case 'TXT':
            return applyTTL({
                data: toTextPayload(form.textData ?? '')
            })
        case 'SPF':
            return applyTTL({
                data: toTextPayload(form.textData ?? '')
            })
        case 'CAA':
            return applyTTL({
                flags: Number(form.flags),
                tag: form.tag!.trim(),
                value: form.value!.trim()
            })
        default:
            throw new Error(`Unsupported record type: ${form.type}`)
    }
}

const buildPayload = (form: RecordForm): RecordPayload => {
    const subdomain = normalizeSubdomain(form.subdomain)
    const schema = DNSRecordDataSchemas[form.type]
    const record_data = schema.parse(buildRecordData(form))

    return {
        subdomain,
        type: form.type,
        record_data
    } as RecordPayload
}

const formatRecordValue = (record: DomainRecord) => {
    switch (record.type) {
        case 'A':
        case 'AAAA':
            return record.record_data.address
        case 'CNAME':
            return record.record_data.domain
        case 'MX':
            return `${record.record_data.exchange} (priority ${record.record_data.priority})`
        case 'SRV':
            return `${record.record_data.target}:${record.record_data.port} · pr ${record.record_data.priority} / w ${record.record_data.weight}`
        case 'TXT':
        case 'SPF':
            return Array.isArray(record.record_data.data)
                ? record.record_data.data.join(' ')
                : record.record_data.data
        case 'CAA':
            return `${record.record_data.tag} ${record.record_data.value} (flags ${record.record_data.flags})`
    }
}

const formatRecordMeta = (record: DomainRecord) => {
    const ttl = record.record_data.ttl
    return ttl ? `TTL ${ttl}s` : 'TTL default'
}

const recordBadgeColors: Record<RecordType, string> = {
    A: 'primary',
    AAAA: 'primary',
    CNAME: 'neutral',
    MX: 'amber',
    SRV: 'indigo',
    TXT: 'purple',
    SPF: 'purple',
    CAA: 'cyan'
}

const columns: TableColumn<DomainRecord>[] = (() => {
    const UBadge = resolveComponent('UBadge')
    const UButton = resolveComponent('UButton')

    return [
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) =>
                h(
                    UBadge,
                    {
                        color: recordBadgeColors[row.original.type],
                        variant: 'soft'
                    },
                    () => row.original.type
                )
        },
        {
            id: 'host',
            header: 'Host',
            cell: ({ row }) => formatHost(row.original.subdomain)
        },
        {
            id: 'value',
            header: 'Details',
            cell: ({ row }) =>
                h('div', { class: 'flex flex-col text-sm' }, [
                    h('span', { class: 'font-medium text-default-900' }, formatRecordValue(row.original)),
                    h('span', { class: 'text-default-500' }, formatRecordMeta(row.original))
                ])
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
            cell: ({ row }) =>
                h('div', { class: 'flex justify-end gap-2' }, [
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
})()

const hasRecords = computed(() => records.value.length > 0)
const recordCountLabel = computed(() => {
    const count = records.value.length
    return count === 1 ? '1 record' : `${count} records`
})
const lastRefreshedLabel = computed(() => {
    if (!lastLoadedAt.value) {
        return 'Not loaded yet'
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(lastLoadedAt.value))
})

type FetchRecordsOptions = {
    silent?: boolean
}

const fetchRecords = async ({ silent }: FetchRecordsOptions = {}) => {
    if (loadingRecords.value) {
        return
    }

    loadingRecords.value = true
    loadError.value = null

    try {
        const result = await api.getDomainsDomainIdRecords({
            path: { domainID: domainId },
            ignoreResponseError: true
        })

        if (!result.success) {
            loadError.value = result.message || 'Unable to load records.'
            if (!silent) {
                toast.add({
                    title: 'Unable to load records',
                    description: loadError.value,
                    color: 'error',
                    icon: 'i-lucide-alert-triangle'
                })
            }
            return
        }

        records.value = result.data
        lastLoadedAt.value = Date.now()
    } catch (error) {
        console.error(error)
        loadError.value = 'Unexpected error while loading records.'
        if (!silent) {
            toast.add({
                title: 'Unexpected error',
                description: loadError.value,
                color: 'error',
                icon: 'i-lucide-bug'
            })
        }
    } finally {
        loadingRecords.value = false
    }
}

await fetchRecords({ silent: true })

const resetForm = (type: RecordType = 'A') => {
    Object.assign(recordState, {
        subdomain: '@',
        type,
        ttl: '',
        ...emptySpecificFields()
    })
}

const handleRecordSubmit = async (event: FormSubmitEvent<RecordForm>) => {
    if (creatingRecord.value) {
        return
    }

    creatingRecord.value = true
    try {
        const payload = buildPayload(event.data)

        const result = await api.postDomainsDomainIdRecords({
            path: { domainID: domainId },
            body: payload,
            ignoreResponseError: true
        })

        if (result.success) {
            toast.add({
                title: 'Record added',
                description: `${payload.type} → ${formatHost(payload.subdomain)}`,
                icon: 'i-lucide-check',
                color: 'success'
            })

            resetForm(payload.type)
            await fetchRecords({ silent: true })
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
}

const deleteRecord = async (recordId: number) => {
    if (deletingRecordId.value === recordId) {
        return
    }

    deletingRecordId.value = recordId
    try {
        const result = await api.deleteDomainsDomainIdRecordsRecordId({
            path: {
                domainID: domainId,
                recordID: String(recordId)
            },
            ignoreResponseError: true
        })

        if (result.success) {
            toast.add({
                title: 'Record removed',
                icon: 'i-lucide-check',
                color: 'success'
            })

            await fetchRecords({ silent: true })
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
}

const copyRecord = async (record: DomainRecord) => {
    const value = `${record.type} ${formatHost(record.subdomain)} ${formatRecordValue(record)} (${formatRecordMeta(record)})`.trim()
    await copy(value)
    toast.add({
        title: 'Record copied',
        icon: 'i-lucide-clipboard-copy',
        color: 'success'
    })
}
</script>

<template>
    <div class="space-y-6">
        <UCard>
            <template #header>
                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p class="text-base font-medium">Additional DNS records</p>
                        <p class="text-sm text-default-500">
                            Served alongside the automatic DDNS updates for
                            <span class="font-semibold text-default-700">{{ fullDomain }}</span>.
                        </p>
                    </div>
                    <div class="flex flex-col items-start gap-2 text-sm md:items-end">
                        <div class="flex items-center gap-2 text-xs text-default-500">
                            <UBadge variant="soft" color="neutral">
                                {{ recordCountLabel }}
                            </UBadge>
                            <span>{{ lastRefreshedLabel }}</span>
                        </div>
                        <UButton variant="ghost" icon="i-lucide-rotate-ccw" :loading="loadingRecords"
                            @click="fetchRecords()">
                            Refresh
                        </UButton>
                    </div>
                </div>
            </template>

            <UAlert v-if="loadError" color="error" icon="i-lucide-alert-triangle"
                title="Unable to load DNS records" class="mb-4">
                <template #description>
                    {{ loadError }}
                </template>
            </UAlert>

            <div v-if="loadingRecords && !hasRecords" class="py-12 text-center text-sm text-default-500">
                Loading records…
            </div>

            <div v-else-if="!hasRecords"
                class="rounded-lg border border-dashed border-default/60 p-6 text-sm text-default-500">
                <p class="mb-1 font-medium text-default-700">No custom records yet</p>
                <p>Use the form below to add MX, TXT, or service-specific entries. Records become active immediately.
                </p>
            </div>

            <UTable v-else :data="records" :columns="columns" class="flex-1" />
        </UCard>

        <UForm :schema="recordSchema" :state="recordState" @submit="handleRecordSubmit">
            <UCard>
                <template #header>
                    <div class="flex flex-col gap-1">
                        <p class="text-base font-medium">Add record</p>
                        <p class="text-sm text-default-500">
                            Use @ for the root hostname. {{ recordTypeHelper }}
                        </p>
                    </div>
                </template>

                <div class="grid gap-4 md:grid-cols-4">

                    <UFormField name="type" label="Type" class="md:col-span-1" required>
                        <USelect v-model="recordState.type" :items="recordTypeOptions" />
                    </UFormField>
                    
                    <UFormField name="subdomain" label="Host" class="md:col-span-1" required>
                        <UInput v-model="recordState.subdomain" placeholder="@" />
                    </UFormField>

                    <UFormField name="ttl" label="TTL (seconds)" class="md:col-span-2">
                        <UInput v-model="recordState.ttl" type="number" min="1" max="86400" step="60"
                            placeholder="Default" />
                    </UFormField>

                    <template v-if="recordState.type === 'A' || recordState.type === 'AAAA'">
                        <UFormField name="address" :label="recordState.type === 'A' ? 'IPv4 address' : 'IPv6 address'"
                            class="md:col-span-4" required>
                            <UInput v-model="recordState.address"
                                :placeholder="recordState.type === 'A' ? '203.0.113.5' : '2001:db8::1'" />
                        </UFormField>
                    </template>

                    <template v-else-if="recordState.type === 'CNAME'">
                        <UFormField name="domain" label="Target hostname" class="md:col-span-4" required>
                            <UInput v-model="recordState.domain" placeholder="app.example.com" />
                        </UFormField>
                    </template>

                    <template v-else-if="recordState.type === 'MX'">
                        <UFormField name="exchange" label="Mail exchanger" class="md:col-span-3" required>
                            <UInput v-model="recordState.exchange" placeholder="mail.example.com" />
                        </UFormField>
                        <UFormField name="priority" label="Priority" class="md:col-span-1" required>
                            <UInput v-model="recordState.priority" type="number" min="0" />
                        </UFormField>
                    </template>

                    <template v-else-if="recordState.type === 'SRV'">
                        <UFormField name="target" label="Target hostname" class="md:col-span-2" required>
                            <UInput v-model="recordState.target" placeholder="server.example.com" />
                        </UFormField>
                        <UFormField name="priority" label="Priority" class="md:col-span-1" required>
                            <UInput v-model="recordState.priority" type="number" min="0" />
                        </UFormField>
                        <UFormField name="weight" label="Weight" class="md:col-span-1" required>
                            <UInput v-model="recordState.weight" type="number" min="0" />
                        </UFormField>
                        <UFormField name="port" label="Port" class="md:col-span-1" required>
                            <UInput v-model="recordState.port" type="number" min="1" max="65535" />
                        </UFormField>
                    </template>

                    <template v-else-if="recordState.type === 'TXT' || recordState.type === 'SPF'">
                        <UFormField name="textData" label="Text payload" class="md:col-span-4" required>
                            <UTextarea v-model="recordState.textData" :rows="3"
                                placeholder="v=spf1 include:_spf.example.net ~all" />
                        </UFormField>
                    </template>

                    <template v-else-if="recordState.type === 'CAA'">
                        <UFormField name="flags" label="Flags" class="md:col-span-1" required>
                            <UInput v-model="recordState.flags" type="number" min="0" />
                        </UFormField>
                        <UFormField name="tag" label="Tag" class="md:col-span-1" required>
                            <UInput v-model="recordState.tag" placeholder="issue" />
                        </UFormField>
                        <UFormField name="value" label="Value" class="md:col-span-2" required>
                            <UInput v-model="recordState.value" placeholder="letsencrypt.org" />
                        </UFormField>
                    </template>
                </div>

                <template #footer>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p class="text-xs text-default-500">
                            Records sync to the NowIP DNS backend instantly. Refresh to confirm the latest state.
                        </p>
                        <UButton type="submit" color="primary" :loading="creatingRecord">
                            Create record
                        </UButton>
                    </div>
                </template>
            </UCard>
        </UForm>
    </div>
</template>

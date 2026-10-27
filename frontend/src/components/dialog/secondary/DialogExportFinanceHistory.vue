<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-99999 bg-gray-900/50" @click="close"></div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isOpen"
        class="fixed inset-y-0 right-0 z-99999 flex w-full max-w-sm flex-col bg-white shadow-xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
      >
        <div class="sidebar-gradient-bg relative flex shrink-0 items-center justify-between gap-3 px-5 py-5">
          <div>
            <h4 class="text-lg font-semibold text-white">Export Finance History</h4>
            <p class="mt-1 text-sm text-white/70">Download reviewed requests as an XLSX report.</p>
          </div>
          <button
            @click="close"
            type="button"
            class="transition-color flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <CloseIcon class="h-5 w-5" />
          </button>
        </div>

        <form class="flex flex-1 flex-col overflow-hidden" @submit.prevent="submit">
          <div class="no-scrollbar flex-1 overflow-y-auto px-5 py-5">
            <div class="flex flex-col gap-4">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Reviewed Date Range</label>
                <div class="grid grid-cols-2 gap-3">
                  <DateField v-model="form.date_from" />
                  <DateField v-model="form.date_to" />
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Requester Department</label>
                <SearchableSelect
                  v-model="form.department_id"
                  :options="departmentOptions"
                  :disabled="isLoadingMaster"
                  placeholder="All departments"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Target Department</label>
                <SearchableSelect
                  v-model="form.target_department_id"
                  :options="departmentOptions"
                  :disabled="isLoadingMaster"
                  placeholder="All departments"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Request Purpose</label>
                <SearchableSelect
                  v-model="form.purpose_id"
                  :options="purposeOptions"
                  :disabled="isLoadingMaster"
                  placeholder="All purposes"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Return Type</label>
                <SearchableSelect
                  v-model="form.return_type"
                  :options="returnTypeOptions"
                  placeholder="All types"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
                <SearchableSelect
                  v-model="form.status"
                  :options="statusOptions"
                  placeholder="All statuses"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">SKU</label>
                <input
                  v-model="form.sku"
                  type="text"
                  placeholder="Exact SKU code"
                  class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Search</label>
                <input
                  v-model="form.search"
                  type="text"
                  placeholder="Request no, requester, or purpose..."
                  class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>

              <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>
              <p v-if="successMessage" class="text-sm text-success-600 dark:text-success-500">{{ successMessage }}</p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
            <button
              @click="close"
              type="button"
              class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <DownloadIcon class="h-4 w-4" />
              {{ isSubmitting ? 'Exporting...' : 'Export XLSX' }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import { DownloadIcon, CloseIcon } from '@/icons'
import { getDepartments, getRequestPurposes, exportFinanceRequestsReport } from '@/service/api'
import { triggerBlobDownload, parseBlobErrorMessage } from '@/utils/download'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const STATUS_OPTIONS = [
  'PENDING_DEPARTMENT_APPROVAL',
  'REVERTED_TO_REQUESTER',
  'PENDING_FINANCE_REVIEW',
  'PICKING',
  'ADMINISTRATIVE_FULFILLMENT',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'PARTIALLY_RECEIVED',
  'RETURN_PENDING',  'COMPLETED',
  'REJECTED',
  'CANCELED',
]

function formatStatusLabel(status) {
  if (!status) return '-'
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

const RETURN_TYPE_OPTIONS = [
  { id: '', name: 'All types' },
  { id: 'RETURNABLE', name: 'Returnable' },
  { id: 'NON_RETURNABLE', name: 'Non-returnable' },
]

function createForm() {
  return {
    date_from: '',
    date_to: '',
    department_id: '',
    target_department_id: '',
    purpose_id: '',
    return_type: '',
    status: '',
    sku: '',
    search: '',
  }
}

const form = reactive(createForm())
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const departments = ref([])
const purposes = ref([])
const isLoadingMaster = ref(false)
let masterLoaded = false

function deptId(item) {
  return item?.id ?? item?.department_id ?? item?.code ?? ''
}

function deptLabel(item) {
  return item?.name || item?.department_name || item?.display_name || String(deptId(item))
}

const departmentOptions = computed(() => [
  { id: '', name: 'All departments' },
  ...departments.value.map((dept) => ({ id: deptId(dept), name: deptLabel(dept) })),
])

const purposeOptions = computed(() => [
  { id: '', name: 'All purposes' },
  ...purposes.value.map((purpose) => ({
    id: purpose.id,
    name: purpose.name,
    badge: purpose.return_type === 'RETURNABLE' ? 'Returnable' : 'Non-returnable',
    badgeColor: purpose.return_type === 'RETURNABLE' ? 'success' : 'light',
  })),
])

const returnTypeOptions = RETURN_TYPE_OPTIONS

const statusOptions = computed(() => [
  { id: '', name: 'All statuses' },
  ...STATUS_OPTIONS.map((status) => ({ id: status, name: formatStatusLabel(status) })),
])

async function loadMaster() {
  if (masterLoaded) return
  isLoadingMaster.value = true
  try {
    const [deptRes, purposeRes] = await Promise.all([getDepartments(), getRequestPurposes()])
    departments.value = Array.isArray(deptRes?.data) ? deptRes.data : []
    purposes.value = Array.isArray(purposeRes?.data) ? purposeRes.data : []
    masterLoaded = true
  } catch {
    departments.value = []
    purposes.value = []
  } finally {
    isLoadingMaster.value = false
  }
}

function close() {
  emit('close')
}

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true
  try {
    const { blob, filename } = await exportFinanceRequestsReport({
      date_from: form.date_from,
      date_to: form.date_to,
      department_id: form.department_id,
      target_department_id: form.target_department_id,
      purpose_id: form.purpose_id,
      return_type: form.return_type,
      status: form.status,
      sku: form.sku.trim(),
      search: form.search.trim(),
    })
    triggerBlobDownload(blob, filename)
    successMessage.value = 'Report downloaded.'
  } catch (err) {
    errorMessage.value = await parseBlobErrorMessage(err, err?.message || 'Failed to export finance report.')
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    Object.assign(form, createForm())
    errorMessage.value = ''
    successMessage.value = ''
    loadMaster()
  }
)
</script>

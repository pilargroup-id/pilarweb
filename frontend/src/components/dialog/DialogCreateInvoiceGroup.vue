<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <CloseIcon class="h-5 w-5" />
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Create Invoice Group</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ requests.length }} PB
            <span v-if="companyName">&middot; {{ companyName }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Invoice Number <span class="text-error-500">*</span>
              </label>
              <input
                v-model="invoiceNumber"
                type="text"
                maxlength="120"
                placeholder="INV-2611-001"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                :class="hasInvoiceError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
              />
              <p v-if="hasInvoiceError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                Invoice number wajib diisi.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Company <span class="text-error-500">*</span>
              </label>
              <SearchableSelect
                v-model="companyCode"
                :options="companyOptions"
                :disabled="!!snapshotCompany"
                placeholder="Select company"
              />
              <p v-if="snapshotCompany" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Mengikuti company PB yang dipilih.
              </p>
              <p v-else-if="hasCompanyError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                Company wajib dipilih.
              </p>
              <p v-else-if="missingCompanyCount" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                PB tanpa company akan disimpan dengan company ini.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Note</label>
              <textarea
                v-model="note"
                rows="2"
                placeholder="Optional"
                class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              ></textarea>
            </div>

            <div>
              <p class="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">PB in this invoice</p>
              <ul
                class="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800"
              >
                <li
                  v-for="item in requests"
                  :key="item.request_id"
                  class="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">{{ item.request_number }}</p>
                    <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                      {{ item.requester_name || '-' }}
                      <span v-if="item.request_purpose_name">&middot; {{ item.request_purpose_name }}</span>
                    </p>
                  </div>
                  <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {{ item.item_company_code || 'No company' }}
                  </span>
                </li>
              </ul>
            </div>

            <p v-if="hasMixedCompany" class="text-sm text-error-600 dark:text-error-500">
              Semua PB dalam satu invoice harus berasal dari company yang sama.
            </p>
            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="close"
                type="button"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !invoiceNumber.trim() || !companyCode || !requests.length || hasMixedCompany"
                class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? 'Saving...' : 'Create Invoice' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import { CloseIcon } from '@/icons'
import { createInvoiceGroup } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  // Selected PB rows; each needs request_id, request_number, item_company_code/name.
  // Legacy PB may have no item_company_code — Finance picks the company in that case.
  requests: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'created'])

const invoiceNumber = ref('')
const note = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const hasInvoiceError = ref(false)
const companyCode = ref('')
const hasCompanyError = ref(false)

const COMPANY_NAMES = {
  KATO: 'PT Kato Piagam Indonesia',
  PNM: 'PT Pilar Niaga Makmur',
}
const companyOptions = Object.entries(COMPANY_NAMES).map(([id, name]) => ({ id, name }))

const companyCodes = computed(
  () => new Set(props.requests.map((item) => item.item_company_code).filter(Boolean))
)
const hasMixedCompany = computed(() => companyCodes.value.size > 1)
// Company already stored on the selected PBs (locks the Company field)
const snapshotCompany = computed(() => (companyCodes.value.size === 1 ? [...companyCodes.value][0] : ''))
const missingCompanyCount = computed(() => props.requests.filter((item) => !item.item_company_code).length)
const companyName = computed(() => COMPANY_NAMES[companyCode.value] || '')

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      invoiceNumber.value = ''
      note.value = ''
      errorMessage.value = ''
      hasInvoiceError.value = false
      hasCompanyError.value = false
      companyCode.value = snapshotCompany.value
    }
  }
)

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!invoiceNumber.value.trim()) {
    hasInvoiceError.value = true
    return
  }
  if (!companyCode.value) {
    hasCompanyError.value = true
    return
  }
  if (!props.requests.length || hasMixedCompany.value) return

  hasInvoiceError.value = false
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const res = await createInvoiceGroup({
      invoice_number: invoiceNumber.value.trim(),
      company_code: companyCode.value,
      request_ids: props.requests.map((item) => item.request_id),
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    })
    emit('created', res?.data ?? null)
    isSubmitting.value = false
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal membuat invoice group.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

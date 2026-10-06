<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[980px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
      >
        <div class="sidebar-gradient-bg relative shrink-0 rounded-t-3xl px-6 py-6 lg:px-8">
          <button
            @click="close"
            type="button"
            class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <svg class="fill-current" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Return Inspection</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ returnItem?.return_number }}
            <span v-if="returnItem?.request_number">&middot; {{ returnItem.request_number }}</span>
            <span v-if="returnItem?.requester_name">&middot; {{ returnItem.requester_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading return...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
            <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Returned Qty</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Condition</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Stock Returned Qty</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Condition Note</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="row in rows" :key="row.return_item_id">
                    <td class="px-4 py-3 align-top">
                      <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {{ row.item_name }}
                      </span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.item_code }}</span>
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                      {{ row.returned_qty }}
                    </td>
                    <td class="px-4 py-3 align-top">
                      <SelectField v-model="row.condition_code">
                        <option v-for="opt in CONDITION_OPTIONS" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </option>
                      </SelectField>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model.number="row.stock_returned_qty"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="row.returned_qty"
                        class="dark:bg-dark-900 w-28 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                      />
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model="row.condition_note"
                        type="text"
                        placeholder="Optional note"
                        class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      />
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td colspan="5" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      No items on this return.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Inspection Note
              </label>
              <textarea
                v-model="note"
                rows="2"
                placeholder="Optional overall note for this inspection"
                class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              ></textarea>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">
              {{ errorMessage }}
            </p>

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
                :disabled="isSubmitting || !rows.length"
                class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? 'Saving...' : 'Complete Inspection' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import SelectField from '@/components/forms/FormElements/SelectField.vue'
import { getReturnById, inspectReturn } from '@/service/api'

// Section 13: condition codes allowed by the inspect endpoint. PENDING is the
// seed value before inspection and is never a submittable decision.
const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'OTHER', label: 'Other' },
]

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  returnItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'inspected'])

const isLoading = ref(false)
const loadError = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const note = ref('')
const rows = ref([])

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.returnItem?.id) {
      loadReturn(props.returnItem.id)
    } else if (!open) {
      rows.value = []
      note.value = ''
      errorMessage.value = ''
      loadError.value = ''
    }
  }
)

async function loadReturn(returnId) {
  isLoading.value = true
  loadError.value = ''
  errorMessage.value = ''
  note.value = ''
  try {
    const res = await getReturnById(returnId)
    const detail = res?.data
    if (detail?.status !== 'RECEIVED') {
      loadError.value = 'This return must be received before it can be inspected.'
      rows.value = []
      return
    }
    rows.value = (detail?.items || []).map((item) => ({
      return_item_id: item.id,
      item_name: item.item_name,
      item_code: item.item_code,
      returned_qty: Number(item.returned_qty ?? 0),
      condition_code: 'GOOD',
      condition_note: '',
      stock_returned_qty: Number(item.returned_qty ?? 0),
    }))
  } catch (err) {
    rows.value = []
    loadError.value = err?.message || 'Failed to load return detail.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  if (isSubmitting.value) return
  emit('close')
}

function validateRows() {
  for (const row of rows.value) {
    const qty = Number(row.stock_returned_qty)
    if (Number.isNaN(qty) || qty < 0 || qty > row.returned_qty) {
      return `Stock returned qty for "${row.item_name}" must be between 0 and ${row.returned_qty}.`
    }
  }
  return ''
}

async function submit() {
  if (!props.returnItem) return

  const validationError = validateRows()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await inspectReturn(props.returnItem.id, {
      note: note.value.trim() || null,
      items: rows.value.map((row) => ({
        return_item_id: row.return_item_id,
        condition_code: row.condition_code,
        condition_note: row.condition_note.trim() || null,
        stock_returned_qty: Number(row.stock_returned_qty),
      })),
    })
    emit('inspected')
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to submit return inspection.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

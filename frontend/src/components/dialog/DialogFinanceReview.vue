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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Finance Review</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ queueItem?.request_number }}
            <span v-if="queueItem?.requester_name">&middot; {{ queueItem.requester_name }}</span>
            <span v-if="queueItem?.department_name">&middot; {{ queueItem.department_name }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading request...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
          <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead class="bg-gray-50 dark:bg-white/[0.02]">
                <tr>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Requested</th>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Approved Qty</th>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reject Qty</th>
                  <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Note</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="row in rows" :key="row.request_item_id">
                  <td class="px-4 py-3 align-top">
                    <Badge v-if="row.is_canceled" color="light" size="sm">Canceled</Badge>
                    <div v-else class="flex items-center gap-1.5">
                      <button
                        v-for="opt in DECISION_OPTIONS"
                        :key="opt.value"
                        type="button"
                        :title="opt.label"
                        @click="row.decision = opt.value"
                        :class="[
                          'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                          row.decision === opt.value
                            ? opt.activeClass
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-white/5',
                        ]"
                      >
                        <component :is="opt.icon" class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td class="px-4 py-3 align-top">
                    <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {{ row.item_name }}
                    </span>
                    <span class="block text-theme-xs text-gray-500 dark:text-gray-400">
                      {{ row.item_code }}<span v-if="row.uom_code"> &middot; {{ row.uom_code }}</span>
                    </span>
                  </td>
                  <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ row.requested_qty }}
                  </td>
                  <template v-if="row.is_canceled">
                    <td colspan="3" class="px-4 py-3 align-top text-theme-sm text-gray-400 dark:text-gray-500">
                      &mdash;
                    </td>
                  </template>
                  <template v-else>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model.number="row.approved_qty"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="row.requested_qty"
                        :disabled="row.decision !== 'APPROVED'"
                        class="dark:bg-dark-900 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                      />
                    </td>
                    <td class="px-4 py-3 align-top">
                      <span
                        :class="[
                          'text-theme-sm font-medium',
                          rejectQtyFor(row) > 0
                            ? 'text-error-600 dark:text-error-500'
                            : 'text-gray-400 dark:text-gray-500',
                        ]"
                      >
                        {{ rejectQtyFor(row) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model="row.note"
                        type="text"
                        placeholder="Optional note"
                        class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      />
                    </td>
                  </template>
                </tr>
                <tr v-if="!rows.length">
                  <td colspan="6" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                    No items on this request.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Review Note
            </label>
            <textarea
              v-model="note"
              rows="2"
              placeholder="Optional overall note for this review"
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
              :disabled="isSubmitting || !activeRows.length"
              class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isSubmitting ? 'Saving...' : 'Submit Review' }}
            </button>
          </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Badge from '@/components/ui/Badge.vue'
import { CheckIcon, CloseIcon } from '@/icons'
import { getFinanceRequestById, submitFinanceReview } from '@/service/api'

const DECISION_OPTIONS = [
  {
    value: 'APPROVED',
    label: 'Approve',
    icon: CheckIcon,
    activeClass:
      'border-success-300 bg-success-50 text-success-600 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-500',
  },
  {
    value: 'REJECTED',
    label: 'Reject',
    icon: CloseIcon,
    activeClass:
      'border-error-300 bg-error-50 text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500',
  },
]

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  queueItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'reviewed'])

const isLoading = ref(false)
const loadError = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const note = ref('')
const rows = ref([])

const activeRows = computed(() => rows.value.filter((row) => !row.is_canceled))

function rejectQtyFor(row) {
  if (row.decision === 'REJECTED') return row.requested_qty
  const approved = Number(row.approved_qty) || 0
  return Math.max(row.requested_qty - approved, 0)
}

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.queueItem?.request_id) {
      loadRequest(props.queueItem.request_id)
    } else if (!open) {
      rows.value = []
      note.value = ''
      errorMessage.value = ''
      loadError.value = ''
    }
  }
)

async function loadRequest(requestId) {
  isLoading.value = true
  loadError.value = ''
  errorMessage.value = ''
  note.value = ''
  try {
    const res = await getFinanceRequestById(requestId)
    const detail = res?.data
    const itemsById = new Map((detail?.items || []).map((item) => [Number(item.id), item]))
    const financeItems = detail?.finance_review?.items || []
    rows.value = financeItems.map((fri) => {
      const requestItem = itemsById.get(Number(fri.request_item_id)) || {}
      const isCanceled = requestItem.status === 'CANCELED' || fri.decision === 'CANCELED'
      return {
        request_item_id: fri.request_item_id,
        item_name: requestItem.item_name || '-',
        item_code: requestItem.item_code || '-',
        uom_code: requestItem.uom_code || '',
        requested_qty: Number(requestItem.requested_qty ?? 0),
        decision: 'APPROVED',
        approved_qty: Number(requestItem.requested_qty ?? 0),
        note: '',
        is_canceled: isCanceled,
      }
    })
  } catch (err) {
    rows.value = []
    loadError.value = err?.message || 'Failed to load request detail.'
  } finally {
    isLoading.value = false
  }
}

function close() {
  emit('close')
}

async function submit() {
  if (!props.queueItem?.request_id) return

  for (const row of activeRows.value) {
    if (row.decision === 'APPROVED') {
      if (!row.approved_qty || row.approved_qty <= 0 || row.approved_qty > row.requested_qty) {
        errorMessage.value = `Approved qty for "${row.item_name}" must be greater than 0 and not exceed requested qty.`
        return
      }
    }
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await submitFinanceReview(props.queueItem.request_id, {
      note: note.value.trim() || null,
      items: activeRows.value.map((row) => ({
        request_item_id: row.request_item_id,
        decision: row.decision,
        approved_qty: row.decision === 'APPROVED' ? row.approved_qty : 0,
        note: row.note.trim() || null,
      })),
    })
    emit('reviewed')
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to submit finance review.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

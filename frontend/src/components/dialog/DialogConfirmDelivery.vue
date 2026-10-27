<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[860px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Confirm Physical Receipt</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ deliveryItem?.request_number }}
            <span v-if="deliveryItem?.fulfillment_number">&middot; {{ deliveryItem.fulfillment_number }}</span>
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isLoading" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Memuat data pengiriman...</p>
          </div>
          <div v-else-if="loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <form v-else class="flex flex-col gap-5" @submit.prevent="submit">
            <div
              v-if="deadlineAt"
              class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-theme-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
            >
              Konfirmasi sebelum <span class="font-medium">{{ formatDateTime(deadlineAt) }}</span>, jika tidak maka
              seluruh qty yang dikirim akan otomatis dianggap diterima.
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400">
              Masukkan jumlah barang yang benar-benar diterima secara fisik untuk setiap item. Kurangi jumlahnya jika
              barang yang diterima lebih sedikit dari yang dikirim; selisihnya akan otomatis tercatat sebagai selisih
              pengiriman (discrepancy).
            </p>

            <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead class="bg-gray-50 dark:bg-white/[0.02]">
                  <tr>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Dispatched</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Received Qty</th>
                    <th class="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">Discrepancy</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="row in rows" :key="row.delivery_receipt_item_id">
                    <td class="px-4 py-3 align-top">
                      <span class="block text-theme-sm font-medium text-gray-800 dark:text-white/90">{{ row.item_name }}</span>
                      <span class="block text-theme-xs text-gray-500 dark:text-gray-400">{{ row.item_code }}</span>
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm text-gray-600 dark:text-gray-300">{{ row.dispatched_qty }}</td>
                    <td class="px-4 py-3 align-top">
                      <input
                        v-model.number="row.received_qty"
                        type="number"
                        step="0.01"
                        min="0"
                        :max="row.dispatched_qty"
                        @input="sanitizeQty(row)"
                        class="dark:bg-dark-900 w-24 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800"
                      />
                    </td>
                    <td class="px-4 py-3 align-top text-theme-sm">
                      <span v-if="discrepancyQty(row) > 0" class="font-medium text-warning-600 dark:text-warning-400">
                        -{{ discrepancyQty(row) }}
                      </span>
                      <span v-else class="text-gray-400 dark:text-gray-500">-</span>
                    </td>
                  </tr>
                  <tr v-if="!rows.length">
                    <td colspan="4" class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                      Tidak ada item pada pengiriman ini.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-if="errorMessage" class="text-sm text-error-600 dark:text-error-500">{{ errorMessage }}</p>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                @click="close"
                type="button"
                :disabled="isSubmitting"
                class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="isSubmitting || !rows.length"
                class="flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckIcon class="h-4 w-4" />
                {{ isSubmitting ? 'Confirming...' : 'Confirm Receipt' }}
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
import { CheckIcon } from '@/icons'
import { getDeliveryById, confirmDelivery } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  deliveryItem: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'confirmed'])

const isLoading = ref(false)
const loadError = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const rows = ref([])
const deadlineAt = ref(null)

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.deliveryItem?.id) {
      loadDelivery(props.deliveryItem.id)
    } else if (!open) {
      rows.value = []
      deadlineAt.value = null
      errorMessage.value = ''
      loadError.value = ''
    }
  }
)

async function loadDelivery(id) {
  isLoading.value = true
  loadError.value = ''
  errorMessage.value = ''
  try {
    const res = await getDeliveryById(id)
    const detail = res?.data
    deadlineAt.value = detail?.confirmation_deadline_at || null
    rows.value = (detail?.items || []).map((item) => ({
      delivery_receipt_item_id: item.id,
      item_name: item.item_name,
      item_code: item.item_code,
      dispatched_qty: Number(item.dispatched_qty || 0),
      received_qty: Number(item.dispatched_qty || 0),
    }))
  } catch (err) {
    rows.value = []
    loadError.value = err?.message || 'Gagal memuat detail pengiriman.'
  } finally {
    isLoading.value = false
  }
}

function discrepancyQty(row) {
  const diff = Number(row.dispatched_qty || 0) - Number(row.received_qty || 0)
  return diff > 0.0001 ? Math.round(diff * 100) / 100 : 0
}

function sanitizeQty(row) {
  let value = Number(row.received_qty)
  if (Number.isNaN(value)) value = 0
  if (value < 0) value = 0
  if (value > row.dispatched_qty) value = row.dispatched_qty
  row.received_qty = value
}

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!props.deliveryItem) return

  for (const row of rows.value) {
    const qty = Number(row.received_qty)
    if (Number.isNaN(qty) || qty < 0 || qty > row.dispatched_qty + 0.0001) {
      errorMessage.value = `Qty diterima untuk "${row.item_name}" harus antara 0 dan ${row.dispatched_qty}.`
      return
    }
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await confirmDelivery(props.deliveryItem.id, {
      items: rows.value.map((row) => ({
        delivery_receipt_item_id: row.delivery_receipt_item_id,
        received_qty: Number(row.received_qty),
      })),
    })
    emit('confirmed', props.deliveryItem.id)
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal mengonfirmasi penerimaan fisik barang.'
    if (err?.data?.errors?.code === 'DELIVERY_AUTO_ACCEPTED') {
      emit('confirmed', props.deliveryItem.id)
      close()
    }
  } finally {
    isSubmitting.value = false
  }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

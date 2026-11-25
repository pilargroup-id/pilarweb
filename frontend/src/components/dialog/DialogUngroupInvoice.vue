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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">Ungroup Invoice</h4>
          <p class="pr-12 text-sm text-white/70">
            Keluarkan PB dari invoice group. PB akan kembali ke status Ready To Invoice.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <form class="flex flex-col gap-4" @submit.prevent="submit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Invoice Group <span class="text-error-500">*</span>
              </label>
              <SearchableSelect
                v-model="groupId"
                :options="groupOptions"
                :disabled="isLoadingGroups || isSubmitting"
                :placeholder="isLoadingGroups ? 'Loading invoice groups...' : 'Select invoice number'"
                @update:model-value="loadGroupDetail"
              />
              <p v-if="!isLoadingGroups && !groupOptions.length" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Belum ada invoice group yang berisi PB.
              </p>
            </div>

            <div v-if="groupId">
              <div class="mb-1.5 flex items-center justify-between">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-400">
                  PB in this invoice <span class="text-error-500">*</span>
                </p>
                <label
                  v-if="groupRequests.length"
                  class="flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                >
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    :indeterminate.prop="selectedIds.length > 0 && !isAllSelected"
                    :disabled="isSubmitting"
                    @change="toggleAll($event.target.checked)"
                    class="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                  />
                  Select all
                </label>
              </div>
              <div
                class="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800"
              >
                <p v-if="isLoadingDetail" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading PB...
                </p>
                <p v-else-if="!groupRequests.length" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Tidak ada PB aktif di invoice ini.
                </p>
                <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
                  <li v-for="item in groupRequests" :key="item.request_id">
                    <label class="flex cursor-pointer items-center gap-3 px-4 py-2.5">
                      <input
                        type="checkbox"
                        :value="item.request_id"
                        v-model="selectedIds"
                        :disabled="isSubmitting"
                        class="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">{{ item.request_number }}</p>
                        <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                          {{ item.requester_name || '-' }}
                          <span v-if="item.request_purpose_name">&middot; {{ item.request_purpose_name }}</span>
                        </p>
                      </div>
                      <span class="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                        {{ item.item_company_code || 'No company' }}
                      </span>
                    </label>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Reason <span class="text-error-500">*</span>
              </label>
              <textarea
                v-model="reason"
                rows="3"
                placeholder="Jelaskan alasan PB dikeluarkan dari invoice"
                class="dark:bg-dark-900 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                :class="hasReasonError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
              ></textarea>
              <p v-if="hasReasonError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">Alasan wajib diisi.</p>
            </div>

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
                :disabled="isSubmitting || !groupId || !selectedIds.length || !reason.trim()"
                class="flex justify-center rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? 'Ungrouping...' : `Ungroup${selectedIds.length ? ` (${selectedIds.length})` : ''}` }}
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
import { getInvoiceGroups, getInvoiceGroup, removeInvoiceGroupRequest } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  // Optional: limit the group list to one company (KATO / PNM)
  companyCode: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'ungrouped'])

const groups = ref([])
const groupId = ref('')
const groupRequests = ref([])
const selectedIds = ref([])
const reason = ref('')
const isLoadingGroups = ref(false)
const isLoadingDetail = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const hasReasonError = ref(false)

const groupOptions = computed(() =>
  groups.value
    .filter((group) => Number(group.active_request_count) > 0)
    .map((group) => ({
      id: group.id,
      name: `${group.invoice_number} · ${group.item_company_code || '-'} (${group.active_request_count} PB)`,
    }))
)

const isAllSelected = computed(
  () => groupRequests.value.length > 0 && selectedIds.value.length === groupRequests.value.length
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      groupId.value = ''
      groupRequests.value = []
      selectedIds.value = []
      reason.value = ''
      errorMessage.value = ''
      hasReasonError.value = false
      loadGroups()
    }
  }
)

async function loadGroups() {
  isLoadingGroups.value = true
  try {
    // Backend caps limit at 100; newest groups come first
    const res = await getInvoiceGroups({
      page: 1,
      limit: 100,
      ...(props.companyCode ? { company_code: props.companyCode } : {}),
    })
    groups.value = res?.data ?? []
  } catch (err) {
    groups.value = []
    errorMessage.value = err?.message || 'Gagal memuat invoice group.'
  } finally {
    isLoadingGroups.value = false
  }
}

async function loadGroupDetail(id) {
  groupRequests.value = []
  selectedIds.value = []
  if (!id) return
  isLoadingDetail.value = true
  errorMessage.value = ''
  try {
    const res = await getInvoiceGroup(id)
    // Ignore stale responses if the user switched group meanwhile
    if (groupId.value !== id) return
    groupRequests.value = res?.data?.requests ?? []
  } catch (err) {
    errorMessage.value = err?.message || 'Gagal memuat detail invoice.'
  } finally {
    isLoadingDetail.value = false
  }
}

function toggleAll(checked) {
  selectedIds.value = checked ? groupRequests.value.map((item) => item.request_id) : []
}

function close() {
  if (isSubmitting.value) return
  emit('close')
}

async function submit() {
  if (!groupId.value || !selectedIds.value.length) return
  if (!reason.value.trim()) {
    hasReasonError.value = true
    return
  }

  hasReasonError.value = false
  errorMessage.value = ''
  isSubmitting.value = true
  const ids = [...selectedIds.value]
  const failed = []
  // Endpoint removes one PB at a time
  for (const requestId of ids) {
    try {
      await removeInvoiceGroupRequest(groupId.value, requestId, { reason: reason.value.trim() })
    } catch (err) {
      const number = groupRequests.value.find((item) => item.request_id === requestId)?.request_number || requestId
      failed.push(`${number}: ${err?.message || 'gagal'}`)
    }
  }
  isSubmitting.value = false

  if (failed.length < ids.length) emit('ungrouped')

  if (failed.length) {
    errorMessage.value = `Gagal ungroup ${failed.length} PB — ${failed.join('; ')}`
    await loadGroupDetail(groupId.value)
    loadGroups()
    return
  }
  close()
}
</script>

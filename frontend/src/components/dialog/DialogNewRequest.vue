<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">New Request</h4>
          <p class="pr-12 text-sm text-white/70">Fields marked with * are required.</p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div
            v-if="masterError"
            class="mb-5 rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500"
          >
            {{ masterError }}
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Request Purpose <span class="text-error-500">*</span>
              </label>
              <SelectField
                v-model="form.request_purpose_id"
                :disabled="isLoadingMaster"
                placeholder="Select request purpose"
              >
                <option v-for="purpose in purposes" :key="purpose.id" :value="purpose.id">
                  {{ purpose.name }}
                </option>
              </SelectField>
              <p v-if="hasPurposeError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                Request Purpose is required.
              </p>
              <p
                v-else-if="hasPurposeWithoutWorkflow"
                class="mt-1.5 text-xs text-warning-600 dark:text-orange-400"
              >
                No active workflow is configured for this purpose yet.
              </p>
              <p v-else-if="activeAssignment" class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Workflow: {{ activeAssignment.workflow_name }} v{{ activeAssignment.workflow_version }}
                <template v-if="requiresReturn"> &middot; Returnable</template>
              </p>
            </div>

            <div v-if="requiresReturn">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Return Due Date <span class="text-error-500">*</span>
              </label>
              <DateField v-model="form.return_due_date" />
              <p v-if="hasReturnDateError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                Return Due Date is required for this workflow.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Reason <span class="text-error-500">*</span>
              </label>
              <textarea
                v-model="form.reason"
                rows="3"
                placeholder="Business justification for this request..."
                class="dark:bg-dark-900 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                :class="hasReasonError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
              />
              <p v-if="hasReasonError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">Reason is required.</p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Items <span class="text-error-500">*</span>
              </label>
              <div class="flex flex-col gap-4">
                <BaseTable>
                  <template #head>
                    <TableHeadCell>#</TableHeadCell>
                    <TableHeadCell>Item</TableHeadCell>
                    <TableHeadCell>Qty</TableHeadCell>
                    <TableHeadCell>UOM</TableHeadCell>
                    <TableHeadCell>Notes</TableHeadCell>
                  </template>
                  <RequestItemRow
                    v-for="(row, index) in items"
                    :key="row.key"
                    :model-value="row"
                    :index="index"
                    :can-remove="items.length > 1"
                    :show-errors="submitAttempted"
                    @update:model-value="updateRow(index, $event)"
                    @remove="removeRow(index)"
                  />
                </BaseTable>
                <button
                  @click="addRow"
                  type="button"
                  class="inline-flex w-fit items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-theme-sm font-medium text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:text-brand-400"
                >
                  <PlusIcon class="h-4 w-4" />
                  Add Item
                </button>
              </div>
            </div>

            <div
              v-if="validationErrors.length"
              class="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/15"
            >
              <p class="mb-1 text-sm font-semibold text-error-600 dark:text-error-500">Please fix the following:</p>
              <ul class="list-disc space-y-0.5 pl-5 text-sm text-error-600 dark:text-error-500">
                <li v-for="(err, i) in validationErrors" :key="i">{{ err }}</li>
              </ul>
            </div>

            <Alert
              v-if="submitNotice"
              :variant="submitNotice.variant"
              :title="submitNotice.title"
              :message="submitNotice.message"
            />

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
                :disabled="isSubmitting"
                class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ isSubmitting ? "Submitting..." : "Submit Request" }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Alert from '@/components/ui/Alert.vue'
import SelectField from '@/components/forms/FormElements/SelectField.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import RequestItemRow from '@/components/tables/Request/RequestItemRow.vue'
import { PlusIcon } from '@/icons'
import { getMasterBootstrap, createRequest } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'created'])

const isLoadingMaster = ref(false)
const masterError = ref('')
const purposes = ref([])
const assignments = ref([])
let masterLoaded = false

const form = reactive({
  request_purpose_id: '',
  reason: '',
  return_due_date: '',
})

let rowKeySeed = 0
function createEmptyRow() {
  rowKeySeed += 1
  return { key: rowKeySeed, item_id: '', item_code: '', item_name: '', item_uom: '', qty: '', notes: '' }
}

const items = ref([createEmptyRow()])

function addRow() {
  items.value.push(createEmptyRow())
}

function removeRow(index) {
  if (items.value.length <= 1) return
  items.value.splice(index, 1)
}

function updateRow(index, value) {
  items.value.splice(index, 1, value)
}

// Request Purpose is not permanently tied to one workflow (docs section 7):
// the currently active purpose -> workflow mapping decides whether a Return
// Due Date is required, so it is looked up from master data instead of a
// hardcoded rule.
const activeAssignment = computed(() => {
  if (!form.request_purpose_id) return null
  const now = Date.now()
  const candidates = assignments.value.filter((assignment) => {
    if (String(assignment.request_purpose_id) !== String(form.request_purpose_id)) return false
    if (!assignment.is_active) return false
    const from = assignment.effective_from ? new Date(assignment.effective_from).getTime() : -Infinity
    const to = assignment.effective_to ? new Date(assignment.effective_to).getTime() : Infinity
    return now >= from && now < to
  })
  if (!candidates.length) return null
  return candidates.sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0]
})

const requiresReturn = computed(() => {
  const value = activeAssignment.value?.requires_return
  return value === true || value === 1 || value === '1'
})

const hasPurposeWithoutWorkflow = computed(() => !!form.request_purpose_id && !activeAssignment.value)

watch(requiresReturn, (value) => {
  if (!value) form.return_due_date = ''
})

const submitAttempted = ref(false)
const validationErrors = ref([])
const submitNotice = ref(null)
const isSubmitting = ref(false)

const hasPurposeError = computed(() => submitAttempted.value && !form.request_purpose_id)
const hasReasonError = computed(() => submitAttempted.value && !form.reason.trim())
const hasReturnDateError = computed(
  () => submitAttempted.value && requiresReturn.value && !form.return_due_date
)

function validate() {
  const errors = []
  if (!form.request_purpose_id) errors.push('Request Purpose is required.')
  if (!form.reason.trim()) errors.push('Reason is required.')
  if (requiresReturn.value && !form.return_due_date) errors.push('Return Due Date is required for this workflow.')
  items.value.forEach((row, index) => {
    if (!row.item_id) errors.push(`Item ${index + 1}: select an item from Itembase.`)
    if (!(Number(row.qty) > 0)) errors.push(`Item ${index + 1}: requested qty must be greater than 0.`)
  })
  return errors
}

function buildPayload() {
  return {
    request_purpose_id: form.request_purpose_id,
    reason: form.reason.trim(),
    ...(requiresReturn.value ? { return_due_date: form.return_due_date } : {}),
    items: items.value.map((row) => ({
      itembase_item_id: row.item_id,
      requested_qty: Number(row.qty),
      ...(row.notes?.trim() ? { notes: row.notes.trim() } : {}),
    })),
  }
}

function resetForm() {
  form.request_purpose_id = ''
  form.reason = ''
  form.return_due_date = ''
  items.value = [createEmptyRow()]
  submitAttempted.value = false
  validationErrors.value = []
  submitNotice.value = null
}

async function loadMaster() {
  if (masterLoaded) return
  isLoadingMaster.value = true
  masterError.value = ''
  try {
    const res = await getMasterBootstrap()
    purposes.value = res?.data?.request_purposes ?? []
    assignments.value = res?.data?.purpose_workflow_assignments ?? []
    masterLoaded = true
  } catch (err) {
    masterError.value = err?.message || 'Failed to load master data.'
  } finally {
    isLoadingMaster.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    resetForm()
    loadMaster()
  }
)

function close() {
  emit('close')
}

async function handleSubmit() {
  submitAttempted.value = true
  const errors = validate()
  validationErrors.value = errors
  submitNotice.value = null
  if (errors.length) return

  isSubmitting.value = true
  try {
    const res = await createRequest(buildPayload())
    emit('created', res?.data)
    close()
  } catch (err) {
    validationErrors.value = err?.data?.errors?.details ?? []
    submitNotice.value = {
      variant: 'error',
      title: 'Request not created',
      message: err?.message || 'Failed to create request.',
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

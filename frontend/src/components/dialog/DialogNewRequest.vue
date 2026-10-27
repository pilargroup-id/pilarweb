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

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">{{ isEditMode ? 'Edit Request' : 'New Request' }}</h4>
          <p class="pr-12 text-sm text-white/70">
            {{ isEditMode ? (requestDetail?.request_number || '') : 'Kolom bertanda * wajib diisi.' }}
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
          <div v-if="isEditMode && isLoadingRequest" class="py-10 text-center">
            <p class="text-gray-500 text-theme-sm dark:text-gray-400">Loading request...</p>
          </div>
          <div v-else-if="isEditMode && loadError" class="py-10 text-center">
            <p class="text-error-600 text-theme-sm dark:text-error-500">{{ loadError }}</p>
          </div>
          <template v-else>
          <div
            v-if="masterError"
            class="mb-5 rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500"
          >
            {{ masterError }}
          </div>

          <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Request Purpose <span class="text-error-500">*</span>
                </label>
                <SearchableSelect
                  v-model="form.request_purpose_id"
                  :options="purposeOptions"
                  :disabled="isLoadingMaster"
                  placeholder="Select request purpose"
                />
                <p v-if="hasPurposeError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                  Request Purpose is required.
                </p>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Purpose for Division
                </label>
                <SearchableSelect
                  v-model="form.target_department_id"
                  :options="departmentOptions"
                  :disabled="isLoadingDepartments"
                  placeholder="Select destination department"
                />
                <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Default ke departemen Anda sendiri. Ubah bila request ditujukan ke departemen lain.
                </p>
              </div>
            </div>

            <div v-if="requiresReturn" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Return Due Date <span class="text-error-500">*</span>
                </label>
                <DateField v-model="form.return_due_date" :max="maxReturnDueDate" />
                <p v-if="returnDateError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
                  {{ returnDateError }}
                </p>
                <p v-else class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Maksimal {{ returnDueDays }} hari dari hari ini ({{ maxReturnDueDateLabel }} sesuai kebijakan).
                </p>
              </div>
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
                    :locked="!!row.recordId"
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
                {{ isSubmitting ? "Saving..." : (isEditMode ? "Save Changes" : "Submit Request") }}
              </button>
            </div>
          </form>
          </template>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Alert from '@/components/ui/Alert.vue'
import SearchableSelect from '@/components/forms/FormElements/SearchableSelect.vue'
import DateField from '@/components/forms/FormElements/DateField.vue'
import BaseTable from '@/components/tables/BaseTable.vue'
import TableHeadCell from '@/components/tables/TableHeadCell.vue'
import RequestItemRow from '@/components/tables/Request/RequestItemRow.vue'
import { PlusIcon } from '@/icons'
import { authState } from '@/service/auth'
import {
  getMasterBootstrap,
  getDepartments,
  getRequestById,
  createRequest,
  updateRequest,
  addRequestItem,
  updateRequestItem,
  removeRequestItem,
} from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  requestId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits(['close', 'created', 'updated'])

const isEditMode = computed(() => !!props.requestId)

const isLoadingMaster = ref(false)
const masterError = ref('')
const purposes = ref([])
const requestPolicy = ref(null)
let masterLoaded = false

const isLoadingDepartments = ref(false)
const departments = ref([])
let departmentsLoaded = false

function getDeptId(item) {
  return item?.id ?? item?.department_id ?? item?.code ?? ''
}

function getDeptLabel(item) {
  return item?.name || item?.department_name || item?.display_name || String(getDeptId(item))
}

function getDeptClass(item) {
  return item?.class || item?.department_class || ''
}

function getDeptDisplayLabel(item) {
  const name = getDeptLabel(item)
  const deptClass = getDeptClass(item)
  return deptClass ? `${name} - ${deptClass}` : name
}

const ownDepartmentId = computed(() => {
  const user = authState.user
  if (!user) return ''
  if (user.department_id !== undefined && user.department_id !== null && user.department_id !== '') {
    return String(user.department_id)
  }
  const depts = Array.isArray(user.departments) ? user.departments : []
  const primary = depts.find((d) => Number(d?.is_primary) === 1) || depts[0]
  const id = primary?.department_id ?? primary?.id
  return id !== undefined && id !== null ? String(id) : ''
})

// authState.user is fetched lazily by layout components (UserMenu/AppSidebar), so it may
// not be ready yet when this dialog opens. Fill the default in as soon as it resolves.
watch(
  [() => props.isOpen, ownDepartmentId],
  ([open, deptId]) => {
    if (!open || isEditMode.value) return
    if (!form.target_department_id && deptId) {
      form.target_department_id = deptId
    }
  }
)

const isLoadingRequest = ref(false)
const loadError = ref('')
const requestDetail = ref(null)

const form = reactive({
  request_purpose_id: '',
  target_department_id: '',
  reason: '',
  return_due_date: '',
})

let rowKeySeed = 0
function createEmptyRow() {
  rowKeySeed += 1
  return { key: rowKeySeed, recordId: null, item_id: '', item_code: '', item_name: '', item_uom: '', qty: '', notes: '' }
}

const items = ref([createEmptyRow()])
const removedItemIds = ref([])
let originalItemsById = new Map()

function addRow() {
  items.value.push(createEmptyRow())
}

function removeRow(index) {
  if (items.value.length <= 1) return
  const [removed] = items.value.splice(index, 1)
  if (removed?.recordId) removedItemIds.value.push(removed.recordId)
}

function updateRow(index, value) {
  items.value.splice(index, 1, value)
}

const purposeOptions = computed(() =>
  purposes.value.map((purpose) => ({
    id: purpose.id,
    name: purpose.name,
    badge: purpose.return_type === 'RETURNABLE' ? 'Returnable' : 'Non-returnable',
    badgeColor: purpose.return_type === 'RETURNABLE' ? 'success' : 'light',
  }))
)

const departmentOptions = computed(() =>
  departments.value.map((dept) => ({
    id: getDeptId(dept),
    name: getDeptDisplayLabel(dept),
  }))
)

const selectedPurpose = computed(() =>
  purposes.value.find((purpose) => String(purpose.id) === String(form.request_purpose_id)) ?? null
)
const requiresReturn = computed(() => selectedPurpose.value?.return_type === 'RETURNABLE')

// return_due_days is a ceiling here: the backend always (re)computes the authoritative
// return_due_at from return_due_days once delivery is fully resolved. This field just lets the
// requester flag how long they expect to need it, capped at the policy maximum.
const returnDueDays = computed(() => Number(requestPolicy.value?.return_due_days) || 14)

function formatDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const maxReturnDueDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + returnDueDays.value)
  return formatDateInput(date)
})

const maxReturnDueDateLabel = computed(() => {
  const [y, m, d] = maxReturnDueDate.value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
})

watch(requiresReturn, (value) => {
  if (!value) {
    form.return_due_date = ''
  } else if (!form.return_due_date) {
    form.return_due_date = maxReturnDueDate.value
  }
})

const submitAttempted = ref(false)
const validationErrors = ref([])
const submitNotice = ref(null)
const isSubmitting = ref(false)

const hasPurposeError = computed(() => submitAttempted.value && !form.request_purpose_id)
const hasReasonError = computed(() => submitAttempted.value && !form.reason.trim())

function getReturnDateIssue() {
  if (!requiresReturn.value) return ''
  if (!form.return_due_date) return 'Return Due Date is required for this purpose.'
  if (form.return_due_date > maxReturnDueDate.value) {
    return `Return Due Date cannot be later than ${maxReturnDueDateLabel.value} (maximum ${returnDueDays.value} days from today, per policy).`
  }
  return ''
}

const returnDateError = computed(() => (submitAttempted.value ? getReturnDateIssue() : ''))

function validate() {
  const errors = []
  if (!form.request_purpose_id) errors.push('Request Purpose is required.')
  if (!form.reason.trim()) errors.push('Reason is required.')
  const returnDateIssue = getReturnDateIssue()
  if (returnDateIssue) errors.push(returnDateIssue)

  const firstRowIndexByItemId = new Map()
  items.value.forEach((row, index) => {
    if (!row.item_id) errors.push(`Item ${index + 1}: select an item from Itembase.`)
    const qtyNum = Number(row.qty)
    if (!(qtyNum > 0) || !Number.isInteger(qtyNum))
      errors.push(`Item ${index + 1}: requested qty must be a whole number greater than 0.`)

    if (row.item_id) {
      const key = String(row.item_id)
      if (firstRowIndexByItemId.has(key)) {
        const firstIndex = firstRowIndexByItemId.get(key)
        errors.push(
          `Item ${index + 1}: "${row.item_name}" is already added as item ${firstIndex + 1}. Update the quantity there instead of adding it again.`
        )
      } else {
        firstRowIndexByItemId.set(key, index)
      }
    }
  })
  return errors
}

function buildPayload() {
  return {
    request_purpose_id: form.request_purpose_id,
    ...(form.target_department_id ? { target_department_id: form.target_department_id } : {}),
    reason: form.reason.trim(),
    ...(requiresReturn.value ? { return_due_date: form.return_due_date } : {}),
    items: items.value.map((row) => ({
      itembase_item_id: row.item_id,
      requested_qty: Number(row.qty),
      ...(row.notes?.trim() ? { notes: row.notes.trim() } : {}),
    })),
  }
}

function populateForm() {
  removedItemIds.value = []
  originalItemsById = new Map()

  if (requestDetail.value) {
    form.request_purpose_id = requestDetail.value.request_purpose_id ?? ''
    form.target_department_id = requestDetail.value.target_department_id ?? ''
    form.reason = requestDetail.value.reason ?? ''
    form.return_due_date = requestDetail.value.return_due_date ?? ''

    const requestItems = requestDetail.value.items ?? []
    items.value = requestItems.length
      ? requestItems.map((it) => {
          rowKeySeed += 1
          originalItemsById.set(it.id, { requested_qty: Number(it.requested_qty), notes: it.notes || '' })
          return {
            key: rowKeySeed,
            recordId: it.id,
            item_id: it.itembase_item_id,
            item_code: it.item_code,
            item_name: it.item_name,
            item_uom: it.uom_code,
            qty: it.requested_qty,
            notes: it.notes || '',
          }
        })
      : [createEmptyRow()]
  } else {
    form.request_purpose_id = ''
    form.target_department_id = ownDepartmentId.value
    form.reason = ''
    form.return_due_date = ''
    items.value = [createEmptyRow()]
  }

  submitAttempted.value = false
  validationErrors.value = []
  submitNotice.value = null
}

async function loadRequest() {
  if (!props.requestId) return
  isLoadingRequest.value = true
  loadError.value = ''
  try {
    const res = await getRequestById(props.requestId)
    requestDetail.value = res?.data ?? null
    populateForm()
  } catch (err) {
    requestDetail.value = null
    loadError.value = err?.message || 'Failed to load request.'
  } finally {
    isLoadingRequest.value = false
  }
}

async function loadMaster() {
  if (masterLoaded) return
  isLoadingMaster.value = true
  masterError.value = ''
  try {
    const res = await getMasterBootstrap()
    purposes.value = res?.data?.request_purposes ?? []
    requestPolicy.value = res?.data?.request_policy ?? null
    masterLoaded = true
  } catch (err) {
    masterError.value = err?.message || 'Failed to load master data.'
  } finally {
    isLoadingMaster.value = false
  }
}

async function loadDepartments() {
  if (departmentsLoaded) return
  isLoadingDepartments.value = true
  try {
    const res = await getDepartments()
    departments.value = Array.isArray(res?.data) ? res.data : []
    departmentsLoaded = true
  } catch {
    departments.value = []
  } finally {
    isLoadingDepartments.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) {
      requestDetail.value = null
      loadError.value = ''
      return
    }
    if (props.requestId) {
      loadRequest()
    } else {
      requestDetail.value = null
      populateForm()
    }
    loadMaster()
    loadDepartments()
  }
)

function close() {
  emit('close')
}

async function submitEdit() {
  const requestId = requestDetail.value.id

  await updateRequest(requestId, {
    request_purpose_id: form.request_purpose_id,
    target_department_id: form.target_department_id || undefined,
    reason: form.reason.trim(),
    ...(requiresReturn.value ? { return_due_date: form.return_due_date } : {}),
  })

  for (const itemId of removedItemIds.value) {
    await removeRequestItem(requestId, itemId)
  }

  for (const row of items.value) {
    if (!row.recordId) continue
    const original = originalItemsById.get(row.recordId)
    if (!original) continue
    const qtyChanged = Number(row.qty) !== original.requested_qty
    const notesChanged = (row.notes || '').trim() !== (original.notes || '')
    if (qtyChanged || notesChanged) {
      await updateRequestItem(requestId, row.recordId, {
        requested_qty: Number(row.qty),
        notes: row.notes?.trim() || null,
      })
    }
  }

  for (const row of items.value) {
    if (row.recordId) continue
    await addRequestItem(requestId, {
      itembase_item_id: row.item_id,
      requested_qty: Number(row.qty),
      ...(row.notes?.trim() ? { notes: row.notes.trim() } : {}),
    })
  }
}

async function handleSubmit() {
  submitAttempted.value = true
  const errors = validate()
  validationErrors.value = errors
  submitNotice.value = null
  if (errors.length) return

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      await submitEdit()
      emit('updated')
    } else {
      const res = await createRequest(buildPayload())
      emit('created', res?.data)
    }
    close()
  } catch (err) {
    validationErrors.value = err?.data?.errors?.details ?? []
    submitNotice.value = {
      variant: 'error',
      title: isEditMode.value ? 'Request not updated' : 'Request not created',
      message: err?.message || `Failed to ${isEditMode.value ? 'update' : 'create'} request.`,
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

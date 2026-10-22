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
            <svg class="fill-current" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <h4 class="mb-1 pr-12 text-xl font-semibold text-white">
            Create Approval Rule
          </h4>
          <p class="pr-12 text-sm text-white/70">
            Mengatur kelayakan pemohon dan Persetujuan Departemen. Kolom bertanda * wajib diisi.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Product Department Default"
              required
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div :ref="(el) => (departmentCombo.containerRef.value = el)" class="relative">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Department</label>
            <input
              v-model="departmentCombo.query.value"
              type="text"
              autocomplete="off"
              :placeholder="isLoadingDepartments ? 'Loading departments...' : 'Search department (optional)...'"
              @focus="departmentCombo.open()"
              @click="departmentCombo.open()"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <div
              v-if="departmentCombo.isOpen.value"
              class="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <ul class="custom-scrollbar max-h-56 overflow-y-auto py-1" role="listbox">
                <li v-if="isLoadingDepartments" class="px-3 py-2 text-sm text-gray-400">Loading...</li>
                <li v-else-if="!departmentCombo.filtered.value.length" class="px-3 py-2 text-sm text-gray-400">
                  No departments found.
                </li>
                <li
                  v-for="item in departmentCombo.filtered.value"
                  :key="getDeptId(item)"
                  @click="departmentCombo.select(item)"
                  role="option"
                  class="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                  :class="{ 'bg-gray-50 dark:bg-white/[0.03]': String(getDeptId(item)) === String(form.department_id) }"
                >
                  <span class="block text-sm font-medium text-gray-800 dark:text-white/90">{{ getDeptLabel(item) }}</span>
                </li>
              </ul>
            </div>
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Aturan tanpa departemen digunakan sebagai cadangan ketika suatu departemen tidak memiliki aturannya sendiri. Kosongkan kolom ini untuk menggunakan cadangan global.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div :ref="(el) => (requesterJobLevelCombo.containerRef.value = el)" class="relative">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Requester Block Min Job Level
              </label>
              <input
                v-model="requesterJobLevelCombo.query.value"
                type="text"
                autocomplete="off"
                :placeholder="isLoadingJobLevels ? 'Loading job levels...' : 'Defaults to approver min level'"
                @focus="requesterJobLevelCombo.open()"
                @click="requesterJobLevelCombo.open()"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <div
                v-if="requesterJobLevelCombo.isOpen.value"
                class="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <ul class="custom-scrollbar max-h-56 overflow-y-auto py-1" role="listbox">
                  <li v-if="isLoadingJobLevels" class="px-3 py-2 text-sm text-gray-400">Loading...</li>
                  <li v-else-if="!requesterJobLevelCombo.filtered.value.length" class="px-3 py-2 text-sm text-gray-400">
                    No job levels found.
                  </li>
                  <li
                    v-for="item in requesterJobLevelCombo.filtered.value"
                    :key="getJobLevelKey(item)"
                    @click="requesterJobLevelCombo.select(item)"
                    role="option"
                    class="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                    :class="{ 'bg-gray-50 dark:bg-white/[0.03]': getJobLevelLabel(item) === requesterJobLevelLabel }"
                  >
                    <span class="block text-sm font-medium text-gray-800 dark:text-white/90">{{ getJobLevelLabel(item) }}</span>
                  </li>
                </ul>
              </div>
              <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                Pengguna pada level jabatan ini atau lebih tinggi tidak dapat membuat permintaan.
              </p>
            </div>

            <div :ref="(el) => (approverJobLevelCombo.containerRef.value = el)" class="relative">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Approver Min Job Level *
              </label>
              <input
                v-model="approverJobLevelCombo.query.value"
                type="text"
                autocomplete="off"
                required
                :placeholder="isLoadingJobLevels ? 'Loading job levels...' : 'Search job level...'"
                @focus="approverJobLevelCombo.open()"
                @click="approverJobLevelCombo.open()"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <div
                v-if="approverJobLevelCombo.isOpen.value"
                class="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
              >
                <ul class="custom-scrollbar max-h-56 overflow-y-auto py-1" role="listbox">
                  <li v-if="isLoadingJobLevels" class="px-3 py-2 text-sm text-gray-400">Loading...</li>
                  <li v-else-if="!approverJobLevelCombo.filtered.value.length" class="px-3 py-2 text-sm text-gray-400">
                    No job levels found.
                  </li>
                  <li
                    v-for="item in approverJobLevelCombo.filtered.value"
                    :key="getJobLevelKey(item)"
                    @click="approverJobLevelCombo.select(item)"
                    role="option"
                    class="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                    :class="{ 'bg-gray-50 dark:bg-white/[0.03]': getJobLevelLabel(item) === form.approver_job_level_name }"
                  >
                    <span class="block text-sm font-medium text-gray-800 dark:text-white/90">{{ getJobLevelLabel(item) }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Priority</label>
            <input
              v-model="form.priority"
              type="number"
              placeholder="100"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Angka yang lebih kecil akan dievaluasi lebih dulu jika ada beberapa aturan yang cocok.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-8">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Allow Higher Job Level</label>
              <ToggleSwitch v-model="form.allow_higher_job_level" on-label="Yes" off-label="No" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
              <ToggleSwitch v-model="form.is_active" on-label="Active" off-label="Inactive" />
            </div>
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
              :disabled="isSubmitting"
              class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isSubmitting ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </form>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ToggleSwitch from '@/components/forms/FormElements/ToggleSwitch.vue'
import { createApprovalRule, getDepartments, getJobLevels } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'created'])

const isSubmitting = ref(false)
const errorMessage = ref('')

function slugifyCode(value) {
  const base = (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
  return base
}

function defaultForm() {
  return {
    name: '',
    department_id: '',
    department_name: '',
    requester_block_min_job_level_value: '',
    approver_min_job_level_value: '',
    approver_job_level_name: '',
    priority: 100,
    allow_higher_job_level: true,
    is_active: true,
  }
}

const form = reactive(defaultForm())

const generatedCode = computed(() => slugifyCode(form.name))

const departmentOptions = ref([])
const jobLevelOptions = ref([])
const isLoadingDepartments = ref(false)
const isLoadingJobLevels = ref(false)

function getDeptId(item) {
  return item?.id ?? item?.department_id ?? item?.code ?? ''
}

function getDeptLabel(item) {
  return item?.name || item?.department_name || item?.display_name || String(getDeptId(item))
}

function getJobLevelKey(item) {
  return item?.id ?? item?.code ?? ''
}

function getJobLevelValue(item) {
  const candidate =
    item?.value ?? item?.level_value ?? item?.job_level_value ?? item?.level ?? item?.level_order ?? item?.order ?? item?.id
  const num = Number(candidate)
  return Number.isFinite(num) ? num : candidate
}

function getJobLevelLabel(item) {
  return item?.name || item?.job_level_name || item?.label || String(getJobLevelValue(item))
}

async function loadDepartments() {
  if (isLoadingDepartments.value) return
  isLoadingDepartments.value = true
  try {
    const res = await getDepartments()
    departmentOptions.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    departmentOptions.value = []
  } finally {
    isLoadingDepartments.value = false
  }
}

async function loadJobLevels() {
  if (isLoadingJobLevels.value) return
  isLoadingJobLevels.value = true
  try {
    const res = await getJobLevels()
    jobLevelOptions.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    jobLevelOptions.value = []
  } finally {
    isLoadingJobLevels.value = false
  }
}

function createCombo({ options, getLabel, onSelect }) {
  const query = ref('')
  const isOpen = ref(false)
  const containerRef = ref(null)

  const filtered = computed(() => {
    const term = query.value.trim().toLowerCase()
    const list = options.value
    if (!term) return list
    return list.filter((item) => String(getLabel(item)).toLowerCase().includes(term))
  })

  function open() {
    isOpen.value = true
  }

  function select(item) {
    onSelect(item)
    query.value = getLabel(item)
    isOpen.value = false
  }

  function closeAndSync(displayFromModel) {
    isOpen.value = false
    if (!query.value.trim()) {
      onSelect(null)
      return
    }
    query.value = displayFromModel()
  }

  function reset() {
    query.value = ''
    isOpen.value = false
  }

  return { query, isOpen, containerRef, filtered, open, select, closeAndSync, reset }
}

const requesterJobLevelLabel = ref('')

const departmentCombo = createCombo({
  options: departmentOptions,
  getLabel: getDeptLabel,
  onSelect: (item) => {
    form.department_id = item ? getDeptId(item) : ''
    form.department_name = item ? getDeptLabel(item) : ''
  },
})

const requesterJobLevelCombo = createCombo({
  options: jobLevelOptions,
  getLabel: getJobLevelLabel,
  onSelect: (item) => {
    form.requester_block_min_job_level_value = item ? getJobLevelValue(item) : ''
    requesterJobLevelLabel.value = item ? getJobLevelLabel(item) : ''
  },
})

const approverJobLevelCombo = createCombo({
  options: jobLevelOptions,
  getLabel: getJobLevelLabel,
  onSelect: (item) => {
    form.approver_min_job_level_value = item ? getJobLevelValue(item) : ''
    form.approver_job_level_name = item ? getJobLevelLabel(item) : ''
  },
})

// Job level values aren't unique per title (e.g. "Staff" and "Driver" can share
// the same approval tier), so re-deriving a label from the stored value would be
// ambiguous. Always redisplay the label captured at selection time instead.
function departmentDisplay() {
  return form.department_name || ''
}

function requesterJobLevelDisplay() {
  return requesterJobLevelLabel.value
}

function approverJobLevelDisplay() {
  return form.approver_job_level_name || ''
}

function handleClickOutside(event) {
  if (departmentCombo.containerRef.value && !departmentCombo.containerRef.value.contains(event.target)) {
    departmentCombo.closeAndSync(departmentDisplay)
  }
  if (
    requesterJobLevelCombo.containerRef.value &&
    !requesterJobLevelCombo.containerRef.value.contains(event.target)
  ) {
    requesterJobLevelCombo.closeAndSync(requesterJobLevelDisplay)
  }
  if (
    approverJobLevelCombo.containerRef.value &&
    !approverJobLevelCombo.containerRef.value.contains(event.target)
  ) {
    approverJobLevelCombo.closeAndSync(approverJobLevelDisplay)
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function resetForm() {
  Object.assign(form, defaultForm())
  errorMessage.value = ''
  requesterJobLevelLabel.value = ''
  departmentCombo.reset()
  requesterJobLevelCombo.reset()
  approverJobLevelCombo.reset()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadDepartments()
      loadJobLevels()
    } else {
      resetForm()
    }
  }
)

function close() {
  emit('close')
}

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

async function submit() {
  errorMessage.value = ''

  const approverMinLevel = toNullableNumber(form.approver_min_job_level_value)
  if (!form.name.trim()) {
    errorMessage.value = 'Name is required.'
    return
  }
  if (approverMinLevel === null) {
    errorMessage.value = 'Approver min job level is required.'
    return
  }

  const payload = {
    code: generatedCode.value || `RULE-${Date.now().toString(36).toUpperCase()}`,
    name: form.name.trim(),
    department_id: toNullableNumber(form.department_id),
    department_name: form.department_name.trim() || null,
    requester_block_min_job_level_value: toNullableNumber(form.requester_block_min_job_level_value),
    approver_min_job_level_value: approverMinLevel,
    approver_job_level_name: form.approver_job_level_name.trim() || null,
    allow_higher_job_level: form.allow_higher_job_level,
    priority: toNullableNumber(form.priority) ?? 100,
    is_active: form.is_active,
  }

  isSubmitting.value = true
  try {
    const res = await createApprovalRule(payload)
    emit('created', res?.data)
    close()
  } catch (err) {
    errorMessage.value = err?.message || 'Failed to create approval rule.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

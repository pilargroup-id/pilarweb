<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="no-scrollbar relative max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8"
      >
        <button
          @click="close"
          type="button"
          class="transition-color absolute right-5 top-5 z-999 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-white/[0.05] dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-300"
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

        <h4 class="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
          Create Approval Rule
        </h4>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Controls requester eligibility and Department Approval. Fields marked with * are required.
        </p>

        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Code</label>
              <input
                :value="generatedCode"
                type="text"
                placeholder="Generated from name"
                disabled
                class="dark:bg-dark-900 h-11 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm uppercase text-gray-500 shadow-theme-xs placeholder:text-gray-400 placeholder:normal-case dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400 dark:placeholder:text-white/30"
              />
              <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">Auto-generated from name.</p>
            </div>

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
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Department ID</label>
              <input
                v-model="form.department_id"
                type="number"
                placeholder="Leave blank for global fallback"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                A rule with no department is used as the fallback when a department has no rule of its own.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Department Name</label>
              <input
                v-model="form.department_name"
                type="text"
                placeholder="Optional display name"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Requester Block Min Job Level
              </label>
              <input
                v-model="form.requester_block_min_job_level_value"
                type="number"
                placeholder="Defaults to approver min level"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                Users at or above this job level cannot create requests.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Approver Min Job Level *
              </label>
              <input
                v-model="form.approver_min_job_level_value"
                type="number"
                placeholder="e.g. 5"
                required
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Approver Job Level Name</label>
              <input
                v-model="form.approver_job_level_name"
                type="text"
                placeholder="e.g. Assistant Manager"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
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
                Lower number is evaluated first when multiple rules match.
              </p>
            </div>
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
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ToggleSwitch from '@/components/forms/FormElements/ToggleSwitch.vue'
import { createApprovalRule } from '@/service/api'

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

function resetForm() {
  Object.assign(form, defaultForm())
  errorMessage.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) resetForm()
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

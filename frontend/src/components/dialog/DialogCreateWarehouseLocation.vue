<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="close">
    <template #body>
      <div
        class="relative flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900"
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
            {{ isEditMode ? 'Edit Warehouse Location' : 'Create Warehouse Location' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            Fields marked with * are required.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Code</label>
            <input
              :value="form.code"
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
              placeholder="e.g. GOTO Warehouse"
              required
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Loan Warehouse</label>
            <ToggleSwitch v-model="form.is_loan_warehouse" on-label="Yes" off-label="No" />
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Loan warehouses are excluded from Inventory Transfer source options.
            </p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
            <ToggleSwitch v-model="form.is_active" on-label="Active" off-label="Inactive" />
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
              {{ isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update' : 'Create' }}
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
import ToggleSwitch from '@/components/forms/FormElements/ToggleSwitch.vue'
import { createWarehouseLocation, updateWarehouseLocation } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  location: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'created', 'updated'])

const isEditMode = computed(() => !!props.location)

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

const form = reactive({
  code: '',
  name: '',
  is_loan_warehouse: false,
  is_active: true,
})

watch(
  () => form.name,
  (name) => {
    if (!isEditMode.value) form.code = slugifyCode(name)
  }
)

function populateForm(location) {
  form.code = location.code || ''
  form.name = location.name || ''
  form.is_loan_warehouse = !!location.is_loan_warehouse
  form.is_active = location.is_active === undefined ? true : !!location.is_active
}

function resetForm() {
  form.code = ''
  form.name = ''
  form.is_loan_warehouse = false
  form.is_active = true
  errorMessage.value = ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (open && isEditMode.value) populateForm(props.location)
    else if (!open) resetForm()
  }
)

function close() {
  emit('close')
}

async function submit() {
  errorMessage.value = ''
  if (!form.name.trim()) {
    errorMessage.value = 'Name is required.'
    return
  }

  const payload = {
    code: form.code.trim() || `WH-${Date.now().toString(36).toUpperCase()}`,
    name: form.name.trim(),
    is_loan_warehouse: form.is_loan_warehouse,
    is_active: form.is_active,
  }

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      const res = await updateWarehouseLocation(props.location.id, payload)
      emit('updated', res?.data)
    } else {
      const res = await createWarehouseLocation(payload)
      emit('created', res?.data)
    }
    close()
  } catch (err) {
    errorMessage.value = err?.message || `Failed to ${isEditMode.value ? 'update' : 'create'} warehouse location.`
  } finally {
    isSubmitting.value = false
  }
}
</script>

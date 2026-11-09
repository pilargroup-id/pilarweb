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
            {{ isEditMode ? 'Edit Validation Override User' : 'Create Validation Override User' }}
          </h4>
          <p class="pr-12 text-sm text-white/70">
            Pengguna pada daftar ini dapat membuka blokir (override) pelanggaran validasi. Kolom bertanda * wajib diisi.
          </p>
        </div>

        <div class="no-scrollbar overflow-y-auto p-6 lg:p-8">
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div ref="userDropdownRef" class="relative">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">User *</label>
            <input
              ref="userSearchInput"
              v-model="userQuery"
              type="text"
              autocomplete="off"
              :disabled="isEditMode"
              placeholder="Cari nama / username / email pengguna..."
              @focus="openUserDropdown"
              @click="openUserDropdown"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Dipilih dari daftar pengguna PilarGroup. User ID dan Name terisi otomatis.
            </p>

            <div
              v-if="isUserDropdownOpen"
              class="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <ul class="custom-scrollbar max-h-56 overflow-y-auto py-1" role="listbox">
                <li v-if="isLoadingUsers" class="px-3 py-2 text-sm text-gray-400">Loading...</li>
                <li v-else-if="!filteredUsers.length" class="px-3 py-2 text-sm text-gray-400">
                  User tidak ditemukan.
                </li>
                <li
                  v-for="user in filteredUsers"
                  :key="user.id"
                  @click="selectUser(user)"
                  role="option"
                  :aria-selected="String(user.id) === String(form.user_id)"
                  class="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/[0.03]"
                  :class="{ 'bg-gray-50 dark:bg-white/[0.03]': String(user.id) === String(form.user_id) }"
                >
                  <span class="block text-sm font-medium text-gray-800 dark:text-white/90">{{ userLabel(user) }}</span>
                  <span v-if="user.email" class="block text-xs text-gray-400 dark:text-gray-500">{{ user.email }}</span>
                </li>
              </ul>
            </div>
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
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import ToggleSwitch from '@/components/forms/FormElements/ToggleSwitch.vue'
import { createValidationOverrideUser, updateValidationOverrideUser, getDirectoryUsers } from '@/service/api'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  overrideUser: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'created', 'updated'])

const isEditMode = computed(() => !!props.overrideUser)

const isSubmitting = ref(false)
const errorMessage = ref('')

const form = reactive({
  user_id: '',
  name: '',
  is_active: true,
})

const users = ref([])
const isLoadingUsers = ref(false)
const isUserDropdownOpen = ref(false)
const userQuery = ref('')
const userDropdownRef = ref(null)
const userSearchInput = ref(null)

function userLabel(user) {
  return user?.name || user?.username || user?.email || String(user?.id ?? '')
}

const filteredUsers = computed(() => {
  const term = userQuery.value.trim().toLowerCase()
  if (!term) return users.value
  return users.value.filter((user) =>
    [user.name, user.username, user.email, user.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  )
})

async function loadUsers() {
  if (users.value.length || isLoadingUsers.value) return
  isLoadingUsers.value = true
  try {
    const res = await getDirectoryUsers()
    users.value = res?.data ?? []
  } catch {
    users.value = []
  } finally {
    isLoadingUsers.value = false
  }
}

function openUserDropdown() {
  if (isEditMode.value) return
  isUserDropdownOpen.value = true
  loadUsers()
}

function closeUserDropdown() {
  isUserDropdownOpen.value = false
  userQuery.value = form.name
}

function selectUser(user) {
  form.user_id = String(user.id)
  form.name = userLabel(user)
  userQuery.value = form.name
  isUserDropdownOpen.value = false
}

function handleClickOutside(event) {
  if (userDropdownRef.value && !userDropdownRef.value.contains(event.target)) {
    closeUserDropdown()
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function populateForm(row) {
  form.user_id = row.user_id || ''
  form.name = row.name || ''
  form.is_active = row.is_active === undefined ? true : !!row.is_active
  userQuery.value = form.name
}

function resetForm() {
  form.user_id = ''
  form.name = ''
  form.is_active = true
  errorMessage.value = ''
  userQuery.value = ''
  isUserDropdownOpen.value = false
}

watch(
  () => props.isOpen,
  (open) => {
    if (open && isEditMode.value) populateForm(props.overrideUser)
    else if (!open) resetForm()
  }
)

function close() {
  emit('close')
}

async function submit() {
  errorMessage.value = ''
  if (!form.user_id || !form.name.trim()) {
    errorMessage.value = 'Pilih user terlebih dahulu.'
    return
  }

  const payload = {
    user_id: form.user_id.trim(),
    name: form.name.trim(),
    is_active: form.is_active,
  }

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      const res = await updateValidationOverrideUser(props.overrideUser.id, payload)
      emit('updated', res?.data)
    } else {
      const res = await createValidationOverrideUser(payload)
      emit('created', res?.data)
    }
    close()
  } catch (err) {
    errorMessage.value = err?.message || `Gagal ${isEditMode.value ? 'memperbarui' : 'membuat'} validation override user.`
  } finally {
    isSubmitting.value = false
  }
}
</script>

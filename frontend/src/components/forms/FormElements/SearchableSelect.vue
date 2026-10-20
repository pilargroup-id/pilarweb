<template>
  <div class="relative" v-click-outside="closeDropdown">
    <input
      v-if="searchInField"
      ref="fieldInputRef"
      v-model="searchQuery"
      type="text"
      autocomplete="off"
      :disabled="disabled"
      :placeholder="placeholder"
      @focus="handleFieldFocus"
      @input="handleFieldInput"
      @keydown.escape="closeDropdown"
      @keydown.enter.prevent="selectFirstMatch"
      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-9 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 dark:disabled:bg-white/[0.03] dark:disabled:text-gray-400"
    />
    <button
      v-else
      type="button"
      :disabled="disabled"
      @click="toggleDropdown"
      class="dark:bg-dark-900 flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-left text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800 dark:disabled:bg-white/[0.03] dark:disabled:text-gray-400"
    >
      <span class="flex min-w-0 flex-1 items-center gap-2">
        <span
          class="truncate"
          :class="selectedOption ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 dark:text-gray-500'"
        >
          {{ selectedOption ? selectedOption.name : placeholder }}
        </span>
        <Badge v-if="selectedOption?.badge" size="sm" :color="selectedOption.badgeColor || 'light'">
          {{ selectedOption.badge }}
        </Badge>
      </span>
      <ChevronDownIcon
        class="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <ChevronDownIcon
      v-if="searchInField"
      class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform duration-200 dark:text-gray-400"
      :class="open ? 'rotate-180' : ''"
    />

    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div v-if="!searchInField" class="border-b border-gray-100 p-2 dark:border-gray-800">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>
      <ul class="no-scrollbar overflow-y-auto py-1.5" :class="searchInField ? 'max-h-44' : 'max-h-64'">
        <li
          v-for="option in filteredOptions"
          :key="option.id"
          @click="select(option)"
          class="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          :class="isSelected(option) ? 'bg-brand-50 dark:bg-brand-500/10' : ''"
        >
          <span class="flex min-w-0 items-center gap-2">
            <CheckIcon
              class="h-3.5 w-3.5 shrink-0 text-brand-500"
              :class="isSelected(option) ? 'opacity-100' : 'opacity-0'"
            />
            <span
              class="truncate text-sm font-medium"
              :class="isSelected(option) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'"
            >
              {{ option.name }}
            </span>
            <Badge v-if="option.badge" size="sm" :color="option.badgeColor || 'light'">
              {{ option.badge }}
            </Badge>
          </span>
        </li>
        <li v-if="!options.length" class="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
          No options available.
        </li>
        <li v-else-if="!filteredOptions.length" class="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
          No matches found.
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronDownIcon, CheckIcon } from '@/icons'
import vClickOutside from '@/components/common/v-click-outside.vue'
import Badge from '@/components/ui/Badge.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'Select option',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  searchInField: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const searchQuery = ref('')
const justOpened = ref(false)
const searchInputRef = ref(null)
const fieldInputRef = ref(null)

const selectedOption = computed(
  () => props.options.find((option) => String(option.id) === String(props.modelValue)) ?? null
)

const filteredOptions = computed(() => {
  if (props.searchInField && justOpened.value) return props.options
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return props.options
  return props.options.filter((option) => option.name?.toLowerCase().includes(query))
})

function isSelected(option) {
  return String(option.id) === String(props.modelValue)
}

function toggleDropdown() {
  if (props.disabled) return
  open.value = !open.value
}

function handleFieldFocus() {
  if (props.disabled) return
  open.value = true
  justOpened.value = true
  nextTick(() => fieldInputRef.value?.select())
}

function handleFieldInput() {
  justOpened.value = false
  if (!open.value) open.value = true
}

function selectFirstMatch() {
  if (!props.searchInField || !open.value) return
  const first = filteredOptions.value[0]
  if (first) select(first)
}

function closeDropdown() {
  open.value = false
  justOpened.value = false
  searchQuery.value = props.searchInField ? selectedOption.value?.name || '' : ''
}

function select(option) {
  emit('update:modelValue', option.id)
  closeDropdown()
}

watch(
  selectedOption,
  (option) => {
    if (props.searchInField && !open.value) searchQuery.value = option?.name || ''
  },
  { immediate: true }
)

watch(open, (isOpen) => {
  if (!isOpen || props.searchInField) return
  nextTick(() => searchInputRef.value?.focus())
})
</script>

<script>
export default {
  directives: {
    clickOutside: vClickOutside,
  },
}
</script>

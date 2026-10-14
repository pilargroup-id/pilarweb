<template>
  <div class="relative" v-click-outside="closeDropdown">
    <button
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
      </span>
      <ChevronDownIcon
        class="h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <ul class="no-scrollbar max-h-64 overflow-y-auto py-1.5">
        <li
          v-for="option in options"
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
          </span>
        </li>
        <li v-if="!options.length" class="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
          No options available.
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronDownIcon, CheckIcon } from '@/icons'
import vClickOutside from '@/components/common/v-click-outside.vue'

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
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)

const selectedOption = computed(
  () => props.options.find((option) => String(option.id) === String(props.modelValue)) ?? null
)

function isSelected(option) {
  return String(option.id) === String(props.modelValue)
}

function toggleDropdown() {
  if (props.disabled) return
  open.value = !open.value
}

function closeDropdown() {
  open.value = false
}

function select(option) {
  emit('update:modelValue', option.id)
  closeDropdown()
}
</script>

<script>
export default {
  directives: {
    clickOutside: vClickOutside,
  },
}
</script>

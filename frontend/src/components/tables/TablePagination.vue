<template>
  <p class="text-gray-500 text-theme-xs dark:text-gray-400">
    Showing {{ rangeStart }}-{{ rangeEnd }} of {{ total }} {{ itemLabel }}
  </p>
  <div class="flex flex-wrap items-center gap-4">
    <label class="flex items-center gap-2 text-gray-500 text-theme-sm dark:text-gray-400">
      Rows per page
      <span class="relative inline-flex items-center">
        <select
          :value="limit"
          :disabled="disabled"
          @change="requestLimit(Number($event.target.value))"
          class="peer h-9 appearance-none rounded-lg border border-gray-300 bg-transparent bg-none py-1.5 pl-3 pr-8 text-theme-sm font-medium text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:focus:border-brand-800 dark:disabled:bg-white/[0.03] dark:disabled:text-gray-500"
        >
          <option v-for="option in limitOptions" :key="option" :value="option">{{ option }}</option>
        </select>
        <ChevronDownIcon
          class="pointer-events-none absolute right-2.5 h-4 w-4 text-gray-500 transition-transform duration-200 peer-focus:-rotate-180 dark:text-gray-400"
        />
      </span>
    </label>
    <div class="flex items-center gap-2">
      <button
        @click="requestPage(page - 1)"
        :disabled="disabled || page <= 1"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        Previous
      </button>
      <span class="text-gray-500 text-theme-sm dark:text-gray-400">
        Page {{ page }} of {{ totalPages }}
      </span>
      <button
        @click="requestPage(page + 1)"
        :disabled="disabled || page >= totalPages"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ChevronDownIcon } from '@/icons'

const props = defineProps({
  page: { type: Number, required: true },
  limit: { type: Number, required: true },
  total: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
  itemLabel: { type: String, default: 'items' },
  limitOptions: { type: Array, default: () => [50, 100, 250] },
})

const emit = defineEmits(['update:page', 'update:limit'])

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const rangeEnd = computed(() => Math.min(props.page * props.limit, props.total))

function requestPage(page) {
  if (props.disabled || page < 1 || page > props.totalPages || page === props.page) return
  emit('update:page', page)
}

function requestLimit(limit) {
  if (props.disabled || limit === props.limit) return
  emit('update:limit', limit)
}
</script>

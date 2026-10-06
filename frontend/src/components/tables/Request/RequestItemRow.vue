<template>
  <tr class="border-t border-gray-100 align-top dark:border-gray-800">
    <td class="px-5 py-4 text-sm text-gray-500 sm:px-6 dark:text-gray-400">
      {{ index + 1 }}
    </td>

    <td class="px-5 py-4 sm:px-6">
      <div v-if="locked" class="min-w-[320px] rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
        <span class="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
          {{ modelValue.item_name || '-' }}
        </span>
        <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ modelValue.item_code }}</span>
      </div>
      <div v-else ref="containerRef" class="relative min-w-[320px]">
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            @focus="openDropdown"
            type="text"
            autocomplete="off"
            placeholder="Search item by code or name..."
            class="dark:bg-dark-900 h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            :class="hasItemError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
          />
          <ChevronDownIcon
            class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-700 transition-transform dark:text-gray-400"
            :class="{ 'rotate-180': isDropdownOpen }"
          />
        </div>
      </div>
      <p v-if="hasItemError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">
        Select an item from the list.
      </p>

      <!-- Teleported so the table's horizontal scroll container (overflow-x-auto)
           never clips the dropdown vertically; position is tracked manually. -->
      <Teleport to="body">
        <div
          v-if="isDropdownOpen"
          ref="dropdownRef"
          :style="dropdownStyle"
          class="fixed z-[100000] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <ul class="custom-scrollbar max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800" role="listbox">
            <li v-if="isSearching" class="px-3.5 py-3 text-sm text-gray-400">Searching...</li>
            <li v-else-if="searchError" class="px-3.5 py-3 text-sm text-error-600 dark:text-error-500">
              {{ searchError }}
            </li>
            <li v-else-if="!searchQuery.trim()" class="px-3.5 py-3 text-sm text-gray-400">
              Type to search Itembase items.
            </li>
            <li v-else-if="!results.length" class="px-3.5 py-3 text-sm text-gray-400">No matching item found.</li>
            <li
              v-for="item in results"
              :key="getItemId(item)"
              @click="selectItem(item)"
              role="option"
              class="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
            >
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                  {{ getItemName(item) }}
                </span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ getItemCode(item) }}</span>
              </span>
              <span
                v-if="getItemUom(item)"
                class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/[0.05] dark:text-gray-400"
              >
                {{ getItemUom(item) }}
              </span>
            </li>
          </ul>
        </div>
      </Teleport>
    </td>

    <td class="px-5 py-4 sm:px-6">
      <input
        :value="modelValue.qty"
        @input="updateField('qty', $event.target.value)"
        type="number"
        min="0"
        step="any"
        placeholder="0"
        class="dark:bg-dark-900 h-11 w-24 rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        :class="hasQtyError ? 'border-error-400 dark:border-error-500' : 'border-gray-300 dark:border-gray-700'"
      />
      <p v-if="hasQtyError" class="mt-1.5 text-xs text-error-600 dark:text-error-500">Must be greater than 0.</p>
    </td>

    <td class="px-5 py-4 whitespace-nowrap sm:px-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ modelValue.item_uom || '-' }}</p>
    </td>

    <td class="px-5 py-4 sm:px-6">
      <div class="flex items-center gap-2">
        <input
          :value="modelValue.notes"
          @input="updateField('notes', $event.target.value)"
          type="text"
          placeholder="Optional note"
          class="dark:bg-dark-900 h-11 w-full min-w-[160px] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
        <button
          v-if="canRemove"
          @click="$emit('remove')"
          type="button"
          aria-label="Remove item"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10 dark:hover:text-error-500"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </td>
  </tr>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getItems } from '@/service/api'
import { ChevronDownIcon, TrashIcon } from '@/icons'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  canRemove: {
    type: Boolean,
    default: true,
  },
  showErrors: {
    type: Boolean,
    default: false,
  },
  locked: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'remove'])

const searchQuery = ref(props.modelValue.item_name || '')
const isDropdownOpen = ref(false)
const isSearching = ref(false)
const searchError = ref('')
const results = ref([])
const containerRef = ref(null)
const dropdownRef = ref(null)
const dropdownStyle = reactive({ top: '0px', left: '0px', width: '0px' })
let searchTimer = null

const hasItemError = computed(() => props.showErrors && !props.modelValue.item_id)
const hasQtyError = computed(() => props.showErrors && !(Number(props.modelValue.qty) > 0))

function updateField(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

// The item list is proxied/passed through from Itembase as-is (see docs
// section 4), so its exact field names are not controlled by Pilarweb.
// These getters fall back across the common shapes instead of assuming one.
function getItemId(item) {
  return item?.id ?? item?.item_id ?? item?.code ?? item?.sku ?? ''
}
function getItemCode(item) {
  return item?.code ?? item?.item_code ?? item?.sku ?? ''
}
function getItemName(item) {
  return item?.name ?? item?.item_name ?? item?.description ?? 'Unnamed item'
}
// Itembase returns `uom` as a nested object ({ id, code, name, ... }), not a
// flat string (confirmed in request.service.js's snapshotItem). A bare
// number/string in `uom` is a foreign-key id, not something to show as-is.
function getItemUom(item) {
  const uom = item?.uom
  if (uom && typeof uom === 'object') return uom.code ?? uom.name ?? ''
  return item?.uom_code ?? item?.uom_name ?? ''
}

function normalizeItemList(payload) {
  const data = payload?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

async function runSearch(query) {
  isSearching.value = true
  searchError.value = ''
  try {
    const data = await getItems({ search: query, limit: 10 })
    results.value = normalizeItemList(data)
  } catch (err) {
    results.value = []
    searchError.value = err?.message || 'Failed to search items.'
  } finally {
    isSearching.value = false
  }
}

function updateDropdownPosition() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  dropdownStyle.top = `${rect.bottom + 6}px`
  dropdownStyle.left = `${rect.left}px`
  dropdownStyle.width = `${Math.max(rect.width, 280)}px`
}

function openDropdown() {
  isDropdownOpen.value = true
  updateDropdownPosition()
}

function onSearchInput() {
  openDropdown()
  clearTimeout(searchTimer)
  const query = searchQuery.value.trim()
  if (!query) {
    results.value = []
    if (props.modelValue.item_id) {
      emit('update:modelValue', { ...props.modelValue, item_id: '', item_code: '', item_name: '', item_uom: '' })
    }
    return
  }
  searchTimer = setTimeout(() => runSearch(query), 400)
}

function selectItem(item) {
  searchQuery.value = getItemName(item)
  isDropdownOpen.value = false
  emit('update:modelValue', {
    ...props.modelValue,
    item_id: getItemId(item),
    item_code: getItemCode(item),
    item_name: getItemName(item),
    item_uom: getItemUom(item),
  })
}

function handleClickOutside(event) {
  const target = event.target
  if (containerRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  isDropdownOpen.value = false
  searchQuery.value = props.modelValue.item_name || ''
}

watch(
  () => props.modelValue.item_name,
  (name) => {
    if (!isDropdownOpen.value) searchQuery.value = name || ''
  }
)

watch(isDropdownOpen, (open) => {
  if (open) {
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
  } else {
    window.removeEventListener('scroll', updateDropdownPosition, true)
    window.removeEventListener('resize', updateDropdownPosition)
  }
})

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
  clearTimeout(searchTimer)
})
</script>

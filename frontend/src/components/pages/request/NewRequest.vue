<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div class="space-y-5 sm:space-y-6">
      <div
        v-if="masterError"
        class="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-500"
      >
        {{ masterError }}
      </div>

      <ComponentCard title="Request Details">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </ComponentCard>

      <ComponentCard title="Items">
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
      </ComponentCard>

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

      <div class="flex items-center justify-end gap-3">
        <router-link
          to="/request/my"
          class="flex justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          Cancel
        </router-link>
        <button
          @click="handleSubmit"
          type="button"
          :disabled="isSubmitting"
          class="flex justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? "Submitting..." : "Submit Request" }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import AdminLayout from "@/components/layout/AdminLayout.vue";
import PageBreadcrumb from "@/components/common/PageBreadcrumb.vue";
import ComponentCard from "@/components/common/ComponentCard.vue";
import Alert from "@/components/ui/Alert.vue";
import SelectField from "@/components/forms/FormElements/SelectField.vue";
import DateField from "@/components/forms/FormElements/DateField.vue";
import BaseTable from "@/components/tables/BaseTable.vue";
import TableHeadCell from "@/components/tables/TableHeadCell.vue";
import RequestItemRow from "@/components/tables/Request/RequestItemRow.vue";
import { PlusIcon } from "@/icons";
import { getMasterBootstrap, createRequest } from "@/service/api";

const router = useRouter();

const currentPageTitle = ref("New Request");

const isLoadingMaster = ref(false);
const masterError = ref("");
const purposes = ref([]);
const assignments = ref([]);

const form = reactive({
  request_purpose_id: "",
  reason: "",
  return_due_date: "",
});

let rowKeySeed = 0;
function createEmptyRow() {
  rowKeySeed += 1;
  return { key: rowKeySeed, item_id: "", item_code: "", item_name: "", item_uom: "", qty: "", notes: "" };
}

const items = ref([createEmptyRow()]);

function addRow() {
  items.value.push(createEmptyRow());
}

function removeRow(index) {
  if (items.value.length <= 1) return;
  items.value.splice(index, 1);
}

function updateRow(index, value) {
  items.value.splice(index, 1, value);
}

// Request Purpose is not permanently tied to one workflow (docs section 7):
// the currently active purpose -> workflow mapping decides whether a Return
// Due Date is required, so it is looked up from master data instead of a
// hardcoded rule.
const activeAssignment = computed(() => {
  if (!form.request_purpose_id) return null;
  const now = Date.now();
  const candidates = assignments.value.filter((assignment) => {
    if (String(assignment.request_purpose_id) !== String(form.request_purpose_id)) return false;
    if (!assignment.is_active) return false;
    const from = assignment.effective_from ? new Date(assignment.effective_from).getTime() : -Infinity;
    const to = assignment.effective_to ? new Date(assignment.effective_to).getTime() : Infinity;
    return now >= from && now < to;
  });
  if (!candidates.length) return null;
  return candidates.sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0];
});

const requiresReturn = computed(() => {
  const value = activeAssignment.value?.requires_return;
  return value === true || value === 1 || value === "1";
});

const hasPurposeWithoutWorkflow = computed(() => !!form.request_purpose_id && !activeAssignment.value);

watch(requiresReturn, (value) => {
  if (!value) form.return_due_date = "";
});

const submitAttempted = ref(false);
const validationErrors = ref([]);
const submitNotice = ref(null);
const isSubmitting = ref(false);

const hasPurposeError = computed(() => submitAttempted.value && !form.request_purpose_id);
const hasReasonError = computed(() => submitAttempted.value && !form.reason.trim());
const hasReturnDateError = computed(
  () => submitAttempted.value && requiresReturn.value && !form.return_due_date
);

function validate() {
  const errors = [];
  if (!form.request_purpose_id) errors.push("Request Purpose is required.");
  if (!form.reason.trim()) errors.push("Reason is required.");
  if (requiresReturn.value && !form.return_due_date) errors.push("Return Due Date is required for this workflow.");
  items.value.forEach((row, index) => {
    if (!row.item_id) errors.push(`Item ${index + 1}: select an item from Itembase.`);
    if (!(Number(row.qty) > 0)) errors.push(`Item ${index + 1}: requested qty must be greater than 0.`);
  });
  return errors;
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
  };
}

async function handleSubmit() {
  submitAttempted.value = true;
  const errors = validate();
  validationErrors.value = errors;
  submitNotice.value = null;
  if (errors.length) return;

  isSubmitting.value = true;
  try {
    const res = await createRequest(buildPayload());
    router.push({ path: "/request/my", query: { created: res?.data?.request_number || "1" } });
  } catch (err) {
    validationErrors.value = err?.data?.errors?.details ?? [];
    submitNotice.value = {
      variant: "error",
      title: "Request not created",
      message: err?.message || "Failed to create request.",
    };
  } finally {
    isSubmitting.value = false;
  }
}

async function loadMaster() {
  isLoadingMaster.value = true;
  masterError.value = "";
  try {
    const res = await getMasterBootstrap();
    purposes.value = res?.data?.request_purposes ?? [];
    assignments.value = res?.data?.purpose_workflow_assignments ?? [];
  } catch (err) {
    masterError.value = err?.message || "Failed to load master data.";
  } finally {
    isLoadingMaster.value = false;
  }
}

onMounted(loadMaster);
</script>

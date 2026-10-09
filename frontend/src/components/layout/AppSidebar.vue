<template>
  <aside
    :class="[
      'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 sidebar-gradient-bg text-white h-screen transition-all duration-300 ease-in-out z-99999',
      {
        'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
        'lg:w-[90px]': !isExpanded && !isHovered,
        'translate-x-0 w-[290px]': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div
      :class="[
        'py-8 flex items-center',
        !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
      ]"
    >
      <router-link to="/" class="flex items-center">
        <img
          v-if="isExpanded || isHovered || isMobileOpen"
          src="/images/logo/logo-piagam2.svg"
          alt="Piagam Logo"
          class="h-16 w-auto max-w-[240px] object-contain shrink-0"
        />
        <img
          v-else
          src="/images/logo/logo-piagam.svg"
          alt="Piagam Logo"
          width="48"
          height="48"
          class="shrink-0 object-contain"
        />
      </router-link>
    </div>
    <div
      class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar"
    >
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2
              :class="[
                'mb-4 text-xs uppercase flex leading-[20px] text-white/40',
                !isExpanded && !isHovered
                  ? 'lg:justify-center'
                  : 'justify-start',
              ]"
            >
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button
                  v-if="item.subItems"
                  @click="toggleSubmenu(groupIndex, index)"
                  :class="[
                    'menu-item nav-item group w-full',
                    {
                      'menu-item-active nav-item-active': isSubmenuOpen(groupIndex, index),
                      'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                    },
                    !isExpanded && !isHovered
                      ? 'lg:justify-center'
                      : 'lg:justify-start',
                  ]"
                >
                  <span
                    :class="[
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                  <ChevronDownIcon
                    v-if="isExpanded || isHovered || isMobileOpen"
                    :class="[
                      'ml-auto w-5 h-5 transition-transform duration-200',
                      {
                        'rotate-180 icon-active-gold': isSubmenuOpen(
                          groupIndex,
                          index
                        ),
                      },
                    ]"
                  />
                </button>
                <router-link
                  v-else-if="item.path"
                  :to="item.path"
                  :class="[
                    'menu-item nav-item group',
                    {
                      'menu-item-active nav-item-active': isActive(item.path),
                      'menu-item-inactive': !isActive(item.path),
                    },
                  ]"
                >
                  <span
                    :class="[
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  >
                    <component :is="item.icon" />
                  </span>
                  <span
                    v-if="isExpanded || isHovered || isMobileOpen"
                    class="menu-item-text"
                    >{{ item.name }}</span
                  >
                </router-link>
                <transition
                  @enter="startTransition"
                  @after-enter="endTransition"
                  @before-leave="startTransition"
                  @after-leave="endTransition"
                >
                  <div
                    v-show="
                      isSubmenuOpen(groupIndex, index) &&
                      (isExpanded || isHovered || isMobileOpen)
                    "
                  >
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="subItem in item.subItems" :key="subItem.name">
                        <router-link
                          :to="subItem.path"
                          :class="[
                            'menu-dropdown-item',
                            {
                              'menu-dropdown-item-active': isActive(
                                subItem.path
                              ),
                              'menu-dropdown-item-inactive': !isActive(
                                subItem.path
                              ),
                            },
                          ]"
                        >
                          {{ subItem.name }}
                          <span class="flex items-center gap-1 ml-auto">
                            <span
                              v-if="subItem.new"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              new
                            </span>
                            <span
                              v-if="subItem.pro"
                              :class="[
                                'menu-dropdown-badge',
                                {
                                  'menu-dropdown-badge-active': isActive(
                                    subItem.path
                                  ),
                                  'menu-dropdown-badge-inactive': !isActive(
                                    subItem.path
                                  ),
                                },
                              ]"
                            >
                              pro
                            </span>
                          </span>
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { authState, fetchCapabilities, fetchCurrentUser, isManager } from "@/service/auth";

import {
  ChevronDownIcon,
  HorizontalDots,
  BoxIcon,
  BoxCubeIcon,
  SettingsIcon,
  FolderIcon,
  LayoutDashboardIcon,
  PieChartIcon,
  BarChartIcon,
  TableIcon,
  ChatIcon,
  CheckIcon,
} from "../../icons";
import { useSidebar } from "@/composables/useSidebar";

const route = useRoute();

const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar();

const rawMenuGroups = [
  {
    title: "Menu",
    items: [
      {
        icon: LayoutDashboardIcon,
        name: "Dashboard",
        path: "/",
      },
      // {
      //   icon: ChatIcon,
      //   name: "AI Assistant",
      //   path: "/chat",
      // },
      // {
      //   icon: BoxIcon,
      //   name: "Asset",
      //   subItems: [
      //     { name: "Asset Fixed", path: "/asset/fixed", pro: false },
      //     { name: "Asset Consumeable", path: "/asset/consumeable", pro: false },
      //   ],
      // },
       {
        icon: BoxIcon,
        name: "My Request",
        path: "/request/my",
        hideForManager: true,
      },
      {
        icon: CheckIcon,
        name: "Approvals",
        path: "/approvals",
        managerOnly: true,
      },
      {
        icon: BarChartIcon,
        name: "Finance",
        capability: "finance_access",
        subItems: [
          { name: "Finance Review", path: "/finance-review", pro: false },
          { name: "History Review", path: "/finance-review/history", pro: false },
          { name: "Financial Closing", path: "/financial-closing", pro: false },
        ],
      },
      {
        icon: BoxCubeIcon,
        name: "Warehouse",
        capability: "warehouse_access",
        subItems: [
          { name: "Request Queue", path: "/warehouse/requests", pro: false },
          { name: "Fulfillment / Picking", path: "/warehouse/fulfillments", pro: false },
          { name: "Returns", path: "/returns", pro: false },
        ],
      },
            {
        icon: TableIcon,
        name: "Master",
        subItems: [
          { name: "Request Purpose", path: "/data/RequestPurpose", pro: false },
          { name: "Approval Rules", path: "/data/ApprovalRules", pro: false },
          { name: "WH Locations", path: "/data/WHLocations", pro: false }
        ],
      },
    ],
  },
];

const hasCapability = (item) => {
  if (!item.capability) return true;
  return Boolean(authState.capabilities?.[item.capability]);
};

const isVisible = (item) => {
  if (!hasCapability(item)) return false;
  const userIsManager = isManager(authState.user);
  if (item.managerOnly && !userIsManager) return false;
  if (item.hideForManager && userIsManager) return false;
  return true;
};

const menuGroups = computed(() =>
  rawMenuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(isVisible),
    }))
    .filter((group) => group.items.length > 0)
);

onMounted(() => {
  if (!authState.capabilities) {
    fetchCapabilities().catch(() => {});
  }
  if (!authState.user) {
    fetchCurrentUser().catch(() => {});
  }
});

const isActive = (path) => route.path === path;

const toggleSubmenu = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  openSubmenu.value = openSubmenu.value === key ? null : key;
};

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.value.some((group) =>
    group.items.some(
      (item) =>
        item.subItems && item.subItems.some((subItem) => isActive(subItem.path))
    )
  );
});

const isSubmenuOpen = (groupIndex, itemIndex) => {
  const key = `${groupIndex}-${itemIndex}`;
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value &&
      menuGroups.value[groupIndex].items[itemIndex].subItems?.some((subItem) =>
        isActive(subItem.path)
      ))
  );
};

const startTransition = (el) => {
  el.style.height = "auto";
  const height = el.scrollHeight;
  el.style.height = "0px";
  el.offsetHeight; // force reflow
  el.style.height = height + "px";
};

const endTransition = (el) => {
  el.style.height = "";
};
</script>

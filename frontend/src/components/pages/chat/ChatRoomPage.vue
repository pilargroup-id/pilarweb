<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />
    <div
      class="h-[calc(100dvh-14rem)] min-h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <vue-advanced-chat
        height="100%"
        :currentUserId="currentUserId"
        :rooms="rooms"
        :roomsLoaded="roomsLoaded"
        :loadingRooms="loadingRooms"
        :roomId="activeRoomId"
        :messages="messages"
        :messagesLoaded="messagesLoaded"
        :messageActions="messageActions"
        :textMessages="textMessages"
        :showAddRoom="true"
        :theme="theme"
        @fetch-messages="fetchMessages"
        @send-message="sendMessage"
        @edit-message="editMessage"
        @delete-message="deleteMessage"
        @send-message-reaction="sendMessageReaction"
        @open-file="openFile"
        @add-room="addRoom"
      />
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { register } from 'vue-advanced-chat'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useTheme } from '@/components/layout/ThemeProvider.vue'
import {
  CHAT_CURRENT_USER_ID,
  AI_BOT_USER_ID,
  getChatRooms,
  getChatMessages,
  sendChatMessage,
  sendAiReply,
  createChatConversation,
} from '@/service/templateApi'

register()

const currentPageTitle = ref('AI Assistant')
const currentUserId = ref(CHAT_CURRENT_USER_ID)
const activeRoomId = ref(null)

const { isDarkMode } = useTheme()
const theme = computed(() => (isDarkMode.value ? 'dark' : 'light'))

const rooms = ref([])
const roomsLoaded = ref(false)
const loadingRooms = ref(false)

const messages = ref([])
const messagesLoaded = ref(false)

const messageActions = ref([
  { name: 'editMessage', title: 'Edit Pesan', onlyMe: true },
  { name: 'deleteMessage', title: 'Hapus Pesan', onlyMe: true },
])

const textMessages = ref({
  ROOMS_EMPTY: 'Belum ada riwayat percakapan',
  ROOM_EMPTY: 'Pilih riwayat di samping atau mulai percakapan baru dengan AI Assistant',
  NEW_MESSAGES: 'Pesan baru',
  MESSAGE_DELETED: 'Pesan ini telah dihapus',
  MESSAGES_EMPTY: 'Belum ada pesan, mulai percakapan dengan mengetik di bawah',
  CONVERSATION_STARTED: 'Percakapan dimulai pada:',
  TYPE_MESSAGE: 'Tanyakan sesuatu ke AI Assistant...',
  SEARCH: 'Cari riwayat percakapan',
  IS_ONLINE: 'siap membantu',
  LAST_SEEN: 'terakhir aktif ',
  IS_TYPING: 'sedang mengetik...',
})

function setRoomTyping(roomId, isTyping) {
  rooms.value = rooms.value.map((room) =>
    room.roomId === roomId ? { ...room, typingUsers: isTyping ? [AI_BOT_USER_ID] : [] } : room,
  )
}

async function loadRooms() {
  loadingRooms.value = true
  const res = await getChatRooms()
  rooms.value = res.data
  roomsLoaded.value = true
  loadingRooms.value = false
}

async function fetchMessages(event) {
  const { room } = event.detail[0]

  messagesLoaded.value = false
  const res = await getChatMessages(room.roomId)
  messages.value = res.data
  messagesLoaded.value = true
}

async function sendMessage(event) {
  const { roomId, content, files, replyMessage } = event.detail[0]

  const res = await sendChatMessage(roomId, { content, replyMessage })
  messages.value = [...messages.value, { ...res.data, files }]

  setRoomTyping(roomId, true)

  setTimeout(async () => {
    const aiRes = await sendAiReply(roomId, content || '')
    messages.value = [...messages.value, aiRes.data]

    const roomsRes = await getChatRooms()
    rooms.value = roomsRes.data
  }, 700 + Math.random() * 500)
}

async function addRoom() {
  const res = await createChatConversation()
  rooms.value = [res.data, ...rooms.value]
  messages.value = []
  messagesLoaded.value = true
  activeRoomId.value = res.data.roomId
}

function editMessage(event) {
  const { messageId, newContent } = event.detail[0]
  messages.value = messages.value.map((message) =>
    message._id === messageId ? { ...message, content: newContent, edited: true } : message,
  )
}

function deleteMessage(event) {
  const { message } = event.detail[0]
  messages.value = messages.value.map((item) =>
    item._id === message._id ? { ...item, deleted: true } : item,
  )
}

function sendMessageReaction(event) {
  const { messageId, reaction, remove } = event.detail[0]
  messages.value = messages.value.map((message) => {
    if (message._id !== messageId) return message
    const reactions = { ...(message.reactions || {}) }
    const users = new Set(reactions[reaction] || [])
    if (remove) users.delete(currentUserId.value)
    else users.add(currentUserId.value)
    if (users.size) reactions[reaction] = [...users]
    else delete reactions[reaction]
    return { ...message, reactions }
  })
}

function openFile(event) {
  const { file } = event.detail[0]
  const target = file.url || file.localUrl
  if (target) window.open(target, '_blank')
}

onMounted(() => {
  loadRooms()
  // Force a re-patch of static object/array props: on first mount the
  // vue-advanced-chat custom element may not be fully upgraded yet when
  // Vue first sets these, silently dropping non-string prop values.
  messageActions.value = [...messageActions.value]
  textMessages.value = { ...textMessages.value }
})
</script>

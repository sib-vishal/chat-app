export interface User {
  _id: string
  name: string
  email: string
  image?: string
  online?: boolean
  lastSeen?: Date
}

export interface Message {
  _id: string
  conversationId: string
  senderId: string
  text: string
  createdAt: string | Date
  readBy: string[]
}

export interface Conversation {
  _id: string
  name?: string
  type: "private" | "group"
  image?: string
  participantIds: string[]
  participants: User[]
  createdAt: string | Date
  createdBy?: string
  lastMessage?: Message
  unreadCount: number
  messages: Message[]
}


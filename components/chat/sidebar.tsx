import { formatDistanceToNow } from "date-fns"
import { User, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Conversation } from "@/types/chat"

interface SidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  onlineUsers: string[]
  currentUserId: string
  onSelect: (conversation: Conversation) => void
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onlineUsers,
  currentUserId,
  onSelect,
}: SidebarProps) {
  const getConversationName = (conversation: Conversation) => {
    if (conversation.type === "group") {
      return conversation.name
    }

    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)

    return otherParticipant?.name || "Unknown User"
  }

  const getConversationImage = (conversation: Conversation) => {
    if (conversation.type === "group") {
      return conversation.image || null
    }

    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)

    return otherParticipant?.image || null
  }

  const isUserOnline = (conversation: Conversation) => {
    if (conversation.type === "group") return false

    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)

    return otherParticipant ? onlineUsers.includes(otherParticipant._id) : false
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation._id}
            className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-muted/50 ${
              activeConversationId === conversation._id ? "bg-muted" : ""
            }`}
            onClick={() => onSelect(conversation)}
          >
            <div className="relative">
              <Avatar>
                <AvatarImage src={getConversationImage(conversation)} />
                <AvatarFallback>
                  {conversation.type === "group" ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>

              {isUserOnline(conversation) && (
                <span className="absolute -right-0 -bottom-0 block h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
              )}
            </div>

            <div className="ml-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <p className="font-medium truncate">{getConversationName(conversation)}</p>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground truncate">
                {conversation.lastMessage
                  ? conversation.lastMessage.senderId === currentUserId
                    ? `You: ${conversation.lastMessage.text}`
                    : conversation.lastMessage.text
                  : "Start a conversation"}
              </p>
            </div>

            {conversation.unreadCount > 0 && (
              <div className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {conversation.unreadCount}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


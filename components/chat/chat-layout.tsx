"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { io, type Socket } from "socket.io-client"
import { Moon, Sun, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Sidebar from "@/components/chat/sidebar"
import ChatArea from "@/components/chat/chat-area"
import UserSearch from "@/components/chat/user-search"
import type { User, Conversation } from "@/types/chat"

interface ChatLayoutProps {
  userId: string
}

export default function ChatLayout({ userId }: ChatLayoutProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const [socket, setSocket] = useState<Socket | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      withCredentials: true,
      query: { userId },
    })

    setSocket(newSocket)

    // Fetch user conversations
    fetchConversations()

    return () => {
      // Set user offline and disconnect socket when component unmounts
      if (newSocket) {
        newSocket.disconnect()
      }

      fetch("/api/users/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ online: false }),
      })
    }
  }, [userId])

  useEffect(() => {
    if (!socket) return

    // Socket event listeners
    socket.on("user:online", (userId: string) => {
      setOnlineUsers((prev) => [...prev, userId])
    })

    socket.on("user:offline", (userId: string) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId))
    })

    socket.on("user:typing", ({ conversationId, userId, isTyping }) => {
      if (activeConversation?._id === conversationId) {
        setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }))
      }
    })

    socket.on("message:new", (message) => {
      // Update conversations when new message arrives
      if (activeConversation && message.conversationId === activeConversation._id) {
        setActiveConversation((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : null))
      }

      // Update conversation list to show latest message
      setConversations((prev) =>
        prev.map((conv) => (conv._id === message.conversationId ? { ...conv, lastMessage: message } : conv)),
      )
    })

    socket.on("conversation:new", (conversation) => {
      setConversations((prev) => [conversation, ...prev])
    })

    // Get initial online users
    socket.emit("get:online-users", (users: string[]) => {
      setOnlineUsers(users)
    })

    return () => {
      socket.off("user:online")
      socket.off("user:offline")
      socket.off("user:typing")
      socket.off("message:new")
      socket.off("conversation:new")
    }
  }, [socket, activeConversation])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const handleConversationSelect = async (conversation: Conversation) => {
    // Fetch messages for the selected conversation
    try {
      const response = await fetch(`/api/conversations/${conversation._id}/messages`)
      if (response.ok) {
        const messages = await response.json()
        setActiveConversation({
          ...conversation,
          messages,
        })

        // Mark messages as read
        if (socket) {
          socket.emit("messages:read", { conversationId: conversation._id })
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const handleSendMessage = (text: string) => {
    if (!socket || !activeConversation) return

    socket.emit("message:send", {
      conversationId: activeConversation._id,
      text,
    })
  }

  const handleUserTyping = (isTyping: boolean) => {
    if (!socket || !activeConversation) return

    socket.emit("user:typing", {
      conversationId: activeConversation._id,
      isTyping,
    })
  }

  const handleStartConversation = async (user: User) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      (conv) => conv.type === "private" && conv.participants.some((p) => p._id === user._id),
    )

    if (existingConv) {
      handleConversationSelect(existingConv)
      setIsSearchOpen(false)
      return
    }

    // Create new conversation
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "private",
          participantIds: [user._id],
        }),
      })

      if (response.ok) {
        const newConversation = await response.json()
        setConversations((prev) => [newConversation, ...prev])
        handleConversationSelect(newConversation)
        setIsSearchOpen(false)
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const handleLogout = async () => {
    if (socket) {
      socket.disconnect()
    }

    await fetch("/api/users/status", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ online: false }),
    })

    await signOut({ redirect: false })
    router.push("/")
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="font-bold text-xl">ChatterBox</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversation?._id}
          onlineUsers={onlineUsers}
          currentUserId={userId}
          onSelect={handleConversationSelect}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ChatArea
            conversation={activeConversation}
            currentUserId={userId}
            onSendMessage={handleSendMessage}
            onTyping={handleUserTyping}
            typingUsers={typingUsers}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to ChatterBox</h2>
              <p className="text-muted-foreground">Select a conversation or search for users to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {isSearchOpen && (
        <UserSearch onSelect={handleStartConversation} onClose={() => setIsSearchOpen(false)} currentUserId={userId} />
      )}
    </div>
  )
}


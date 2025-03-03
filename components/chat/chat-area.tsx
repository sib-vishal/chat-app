"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Send, PaperclipIcon, ImageIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Conversation } from "@/types/chat"
import { User } from "lucide-react"

interface ChatAreaProps {
  conversation: Conversation
  currentUserId: string
  onSendMessage: (text: string) => void
  onTyping: (isTyping: boolean) => void
  typingUsers: Record<string, boolean>
  onlineUsers: string[]
}

export default function ChatArea({
  conversation,
  currentUserId,
  onSendMessage,
  onTyping,
  typingUsers,
  onlineUsers,
}: ChatAreaProps) {
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation.messages])

  // Handle typing indicator
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)

    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true)
      onTyping(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      onTyping(false)
    }, 1000)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim()) return

    onSendMessage(message)
    setMessage("")

    // Clear typing state
    setIsTyping(false)
    onTyping(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const getConversationName = () => {
    if (conversation.type === "group") {
      return conversation.name
    }

    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)

    return otherParticipant?.name || "Unknown User"
  }

  const isUserOnline = () => {
    if (conversation.type === "group") return false

    const otherParticipant = conversation.participants.find((p) => p._id !== currentUserId)

    return otherParticipant ? onlineUsers.includes(otherParticipant._id) : false
  }

  const getTypingIndicator = () => {
    const typingParticipants = conversation.participants.filter((p) => p._id !== currentUserId && typingUsers[p._id])

    if (typingParticipants.length === 0) return null

    if (typingParticipants.length === 1) {
      return `${typingParticipants[0].name} is typing...`
    }

    return "Several people are typing..."
  }

  return (
    <>
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center">
        <Avatar>
          {conversation.type === "group" ? (
            conversation.image ? (
              <AvatarImage src={conversation.image} />
            ) : (
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            )
          ) : (
            conversation.participants
              .filter((p) => p._id !== currentUserId)
              .map((p) => <AvatarImage key={p._id} src={p.image} />)[0] || (
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            )
          )}
        </Avatar>
        <div className="ml-3">
          <p className="font-medium">{getConversationName()}</p>
          <p className="text-xs text-muted-foreground">
            {conversation.type === "private" &&
              (isUserOnline() ? <span className="text-green-500">Online</span> : "Offline")}
            {conversation.type === "group" && `${conversation.participants.length} members`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {conversation.messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"}`}
            >
              {message.senderId !== currentUserId && (
                <div className="mr-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={conversation.participants.find((p) => p._id === message.senderId)?.image} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div
                className={`rounded-lg py-2 px-3 max-w-[70%] ${
                  message.senderId === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {message.text}
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === currentUserId ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatDistanceToNow(new Date(message.createdAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </div>
          ))}
          {getTypingIndicator() && <div className="text-xs text-muted-foreground">{getTypingIndicator()}</div>}
          <div ref={messageEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
            <PaperclipIcon className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input value={message} onChange={handleInputChange} placeholder="Type a message" className="flex-1" />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  )
}


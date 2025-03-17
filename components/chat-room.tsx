"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSocket } from "@/hooks/useSocket"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendIcon, AlertCircle } from "lucide-react"

interface Message {
  id: string
  roomId: string
  userId: string
  username: string
  text: string
  timestamp: number
}

interface ChatRoomProps {
  roomId: string
  userId: string
  username: string
}

export function ChatRoom({ roomId, userId, username }: ChatRoomProps) {
  const { socket, isConnected } = useSocket(userId)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Join room on connection
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join_room", roomId)
    }
  }, [socket, isConnected, roomId])

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return

    const handleReceiveMessage = (message: Message) => {
      setMessages((prev) => [...prev, message])
      // Remove typing indicator when message is received
      setTypingUsers((prev) => {
        const newTyping = { ...prev }
        delete newTyping[message.userId]
        return newTyping
      })
    }

    const handleUserTyping = (data: { userId: string; username: string }) => {
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.username }))

      // Clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newTyping = { ...prev }
          delete newTyping[data.userId]
          return newTyping
        })
      }, 3000)
    }

    socket.on("receive_message", handleReceiveMessage)
    socket.on("user_typing", handleUserTyping)

    return () => {
      socket.off("receive_message", handleReceiveMessage)
      socket.off("user_typing", handleUserTyping)
    }
  }, [socket])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = () => {
    if (!socket || !inputMessage.trim()) return

    const newMessage: Message = {
      id: `${Date.now()}-${userId}`,
      roomId,
      userId,
      username,
      text: inputMessage,
      timestamp: Date.now(),
    }

    socket.emit("send_message", newMessage)
    setMessages((prev) => [...prev, newMessage])
    setInputMessage("")
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)

    // Emit typing event with debounce
    if (socket) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", {
          roomId,
          userId,
          username,
        })
      }, 300)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chat Room: {roomId}</span>
          {!isConnected && (
            <div className="flex items-center text-red-500 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              Disconnected
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[400px] pr-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 flex ${message.userId === userId ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex ${message.userId === userId ? "flex-row-reverse" : "flex-row"} items-start gap-2`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{message.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div
                  className={`px-3 py-2 rounded-lg max-w-[80%] ${
                    message.userId === userId ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="text-xs mb-1">{message.username}</div>
                  <p>{message.text}</p>
                </div>
              </div>
            </div>
          ))}
          {Object.keys(typingUsers).length > 0 && (
            <div className="text-sm text-muted-foreground italic mb-2">
              {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex w-full items-center space-x-2">
          <Input
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={!isConnected}
          />
          <Button onClick={handleSendMessage} disabled={!isConnected || !inputMessage.trim()} size="icon">
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}


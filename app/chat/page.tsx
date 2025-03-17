"use client"

import type React from "react"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { ChatRoom } from "@/components/chat-room"

export default function ChatPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [userId, setUserId] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [isJoined, setIsJoined] = useState(false)

  // Generate a random user ID on component mount
  useEffect(() => {
    setUserId(`user_${Math.random().toString(36).substring(2, 9)}`)
  }, [])

  const handleJoinChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      setIsJoined(true)
    }
  }

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Join Chat Room</h1>
          <form onSubmit={handleJoinChat} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Join Chat
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <ChatRoom roomId={roomId} userId={userId} username={username} />
    </div>
  )
}


"use client"

import { useState, useEffect } from "react"
import { X, UserIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { User } from "@/types/chat"

interface UserSearchProps {
  onSelect: (user: User) => void
  onClose: () => void
  currentUserId: string
}

export default function UserSearch({ onSelect, onClose, currentUserId }: UserSearchProps) {
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchText.trim()) {
        setSearchResults([])
        return
      }

      setIsLoading(true)

      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchText)}`)
        if (response.ok) {
          const users = await response.json()
          // Filter out current user
          setSearchResults(users.filter((user: User) => user._id !== currentUserId))
        }
      } catch (error) {
        console.error("Error searching users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchUsers, 500)

    return () => clearTimeout(debounce)
  }, [searchText, currentUserId])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Find Users</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Search by email or name"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
          />

          <div className="max-h-72 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center p-3 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => onSelect(user)}
                >
                  <Avatar>
                    <AvatarImage src={user.image} />
                    <AvatarFallback>
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))
            ) : searchText.trim() !== "" ? (
              <p className="text-center text-muted-foreground py-4">No users found</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}


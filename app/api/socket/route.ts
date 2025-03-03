import { createServer } from "http"
import { Server } from "socket.io"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

let io: Server

const initSocketServer = async (req: Request) => {
  if (!io) {
    const httpServer = createServer()
    io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "*",
        credentials: true,
      },
    })

    const { db } = await connectToDatabase()
    const onlineUsers = new Map<string, string>() // userId -> socketId

    io.on("connection", async (socket) => {
      const userId = socket.handshake.query.userId as string

      if (userId) {
        // Add user to online users
        onlineUsers.set(userId, socket.id)

        // Update user status in database
        await db
          .collection("users")
          .updateOne({ _id: new ObjectId(userId) }, { $set: { online: true, lastSeen: new Date() } })

        // Broadcast user online status
        socket.broadcast.emit("user:online", userId)

        // Handle get online users
        socket.on("get:online-users", (callback) => {
          callback(Array.from(onlineUsers.keys()))
        })

        // Handle typing indicator
        socket.on("user:typing", async ({ conversationId, isTyping }) => {
          try {
            // Get conversation
            const conversation = await db.collection("conversations").findOne({
              _id: new ObjectId(conversationId),
            })

            if (conversation) {
              // Notify other participants
              conversation.participantIds.forEach((participantId: ObjectId) => {
                const participantIdStr = participantId.toString()

                if (participantIdStr !== userId && onlineUsers.has(participantIdStr)) {
                  io.to(onlineUsers.get(participantIdStr)!).emit("user:typing", {
                    conversationId,
                    userId,
                    isTyping,
                  })
                }
              })
            }
          } catch (error) {
            console.error("Error handling typing indicator:", error)
          }
        })

        // Handle sending messages
        socket.on("message:send", async ({ conversationId, text }) => {
          try {
            // Create new message
            const newMessage = {
              conversationId: new ObjectId(conversationId),
              senderId: new ObjectId(userId),
              text,
              createdAt: new Date(),
              readBy: [new ObjectId(userId)],
            }

            // Save to database
            const result = await db.collection("messages").insertOne(newMessage)

            // Get conversation
            const conversation = await db.collection("conversations").findOne({
              _id: new ObjectId(conversationId),
            })

            if (conversation) {
              const messageWithId = {
                ...newMessage,
                _id: result.insertedId,
              }

              // Send message to all participants
              conversation.participantIds.forEach((participantId: ObjectId) => {
                const participantIdStr = participantId.toString()

                if (onlineUsers.has(participantIdStr)) {
                  io.to(onlineUsers.get(participantIdStr)!).emit("message:new", messageWithId)
                }
              })
            }
          } catch (error) {
            console.error("Error sending message:", error)
          }
        })

        // Handle marking messages as read
        socket.on("messages:read", async ({ conversationId }) => {
          try {
            await db.collection("messages").updateMany(
              {
                conversationId: new ObjectId(conversationId),
                senderId: { $ne: new ObjectId(userId) },
                readBy: { $ne: new ObjectId(userId) },
              },
              {
                $addToSet: { readBy: new ObjectId(userId) },
              },
            )
          } catch (error) {
            console.error("Error marking messages as read:", error)
          }
        })

        // Handle disconnect
        socket.on("disconnect", async () => {
          // Remove user from online users
          onlineUsers.delete(userId)

          // Update user status in database
          await db
            .collection("users")
            .updateOne({ _id: new ObjectId(userId) }, { $set: { online: false, lastSeen: new Date() } })

          // Broadcast user offline status
          socket.broadcast.emit("user:offline", userId)
        })
      }
    })

    httpServer.listen(3001)
  }

  return NextResponse.json({ status: "Socket server initialized" })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  return initSocketServer(req)
}


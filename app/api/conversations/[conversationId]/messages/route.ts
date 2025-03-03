import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { connectToDatabase } from "@/lib/mongodb"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ObjectId } from "mongodb"

export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = params

    if (!conversationId) {
      return NextResponse.json({ message: "Conversation ID required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if user is part of the conversation
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(conversationId),
      participantIds: new ObjectId(session.user.id),
    })

    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found or access denied" }, { status: 404 })
    }

    // Mark all messages as read by current user
    await db.collection("messages").updateMany(
      {
        conversationId: new ObjectId(conversationId),
        senderId: { $ne: new ObjectId(session.user.id) },
        readBy: { $ne: new ObjectId(session.user.id) },
      },
      {
        $addToSet: { readBy: new ObjectId(session.user.id) },
      },
    )

    // Get messages
    const messages = await db
      .collection("messages")
      .find({ conversationId: new ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .toArray()

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ message: "Error fetching messages" }, { status: 500 })
  }
}


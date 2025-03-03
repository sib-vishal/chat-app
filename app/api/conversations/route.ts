import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { connectToDatabase } from "@/lib/mongodb"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ObjectId } from "mongodb"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()

    // Find all conversations where the current user is a participant
    const conversations = await db
      .collection("conversations")
      .aggregate([
        {
          $match: {
            participantIds: new ObjectId(session.user.id),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "participantIds",
            foreignField: "_id",
            as: "participants",
          },
        },
        {
          $lookup: {
            from: "messages",
            let: { conversationId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$conversationId", "$$conversationId"] },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: "lastMessageArray",
          },
        },
        {
          $addFields: {
            lastMessage: { $arrayElemAt: ["$lastMessageArray", 0] },
            participants: {
              $map: {
                input: "$participants",
                as: "participant",
                in: {
                  _id: "$$participant._id",
                  name: "$$participant.name",
                  email: "$$participant.email",
                  image: "$$participant.image",
                },
              },
            },
            // Count unread messages for current user
            unreadCount: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "message",
                  cond: {
                    $and: [
                      { $ne: ["$$message.senderId", new ObjectId(session.user.id)] },
                      { $not: { $in: [new ObjectId(session.user.id), "$$message.readBy"] } },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            image: 1,
            createdAt: 1,
            participantIds: 1,
            participants: 1,
            lastMessage: 1,
            unreadCount: 1,
          },
        },
        { $sort: { "lastMessage.createdAt": -1 } },
      ])
      .toArray()

    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json({ message: "Error fetching conversations" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { type, name, participantIds } = await req.json()

    if (!type || (type === "private" && !participantIds?.length)) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if private conversation already exists
    if (type === "private" && participantIds.length === 1) {
      const existingConversation = await db.collection("conversations").findOne({
        type: "private",
        participantIds: {
          $all: [new ObjectId(session.user.id), new ObjectId(participantIds[0])],
          $size: 2,
        },
      })

      if (existingConversation) {
        // Return existing conversation with participant details
        const enrichedConversation = await db
          .collection("conversations")
          .aggregate([
            {
              $match: {
                _id: existingConversation._id,
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "participantIds",
                foreignField: "_id",
                as: "participants",
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                type: 1,
                image: 1,
                createdAt: 1,
                participantIds: 1,
                participants: {
                  $map: {
                    input: "$participants",
                    as: "participant",
                    in: {
                      _id: "$$participant._id",
                      name: "$$participant.name",
                      email: "$$participant.email",
                      image: "$$participant.image",
                    },
                  },
                },
              },
            },
          ])
          .next()

        return NextResponse.json(enrichedConversation)
      }
    }

    // Create a new conversation
    const allParticipantIds = [new ObjectId(session.user.id), ...participantIds.map((id: string) => new ObjectId(id))]

    const newConversation = {
      type,
      name: type === "group" ? name : undefined,
      participantIds: allParticipantIds,
      createdAt: new Date(),
      createdBy: new ObjectId(session.user.id),
    }

    const result = await db.collection("conversations").insertOne(newConversation)

    // Fetch participant details
    const enrichedConversation = await db
      .collection("conversations")
      .aggregate([
        {
          $match: {
            _id: result.insertedId,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "participantIds",
            foreignField: "_id",
            as: "participants",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            type: 1,
            image: 1,
            createdAt: 1,
            participantIds: 1,
            participants: {
              $map: {
                input: "$participants",
                as: "participant",
                in: {
                  _id: "$$participant._id",
                  name: "$$participant.name",
                  email: "$$participant.email",
                  image: "$$participant.image",
                },
              },
            },
          },
        },
      ])
      .next()

    return NextResponse.json(enrichedConversation)
  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json({ message: "Error creating conversation" }, { status: 500 })
  }
}


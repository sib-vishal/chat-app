import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { connectToDatabase } from "@/lib/mongodb"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { online } = await req.json()

    const { db } = await connectToDatabase()

    await db.collection("users").updateOne(
      { _id: session.user.id },
      {
        $set: {
          online,
          lastSeen: new Date(),
        },
      },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ message: "Error updating status" }, { status: 500 })
  }
}


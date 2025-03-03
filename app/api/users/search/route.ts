import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { connectToDatabase } from "@/lib/mongodb"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query")

    if (!query) {
      return NextResponse.json({ message: "Query parameter required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Search users by name or email
    const users = await db
      .collection("users")
      .find({
        $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
      })
      .project({ password: 0 }) // Exclude password
      .limit(10)
      .toArray()

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ message: "Error searching users" }, { status: 500 })
  }
}


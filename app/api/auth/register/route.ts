import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hash } from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 })
    }

    // Hash password and create user
    const hashedPassword = await hash(password, 10)

    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      createdAt: new Date(),
      online: false,
      lastSeen: new Date(),
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertedId,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Error creating user" }, { status: 500 })
  }
}


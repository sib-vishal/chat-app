import NextAuth, { type AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import { compare } from "bcryptjs"
import { MongoDBAdapter } from "@auth/mongodb-adapter"

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter({
    connectToDatabase,
  } as any),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        const { db } = await connectToDatabase()
        const user = await db.collection("users").findOne({ email: credentials.email })

        if (!user) {
          throw new Error("No user found with this email")
        }

        const passwordMatch = await compare(credentials.password, user.password)

        if (!passwordMatch) {
          throw new Error("Invalid password")
        }

        // Update user's online status
        await db.collection("users").updateOne({ _id: user._id }, { $set: { online: true, lastSeen: new Date() } })

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }


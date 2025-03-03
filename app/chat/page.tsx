import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import ChatLayout from "@/components/chat/chat-layout"

export default async function ChatPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  return <ChatLayout userId={session.user.id} />
}


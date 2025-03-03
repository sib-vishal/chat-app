import Image from "next/image"
import LoginForm from "@/components/login-form"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Image
            src="/placeholder.svg?height=60&width=60"
            width={60}
            height={60}
            alt="ChatterBox Logo"
            className="rounded-lg bg-primary p-2"
          />
          <h1 className="text-3xl font-bold">ChatterBox</h1>
          <p className="text-sm text-muted-foreground">Connect with friends in real-time</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}


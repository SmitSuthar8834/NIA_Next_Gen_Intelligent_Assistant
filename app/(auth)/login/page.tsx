"use client"

import { useState } from "react"
import { Logo } from "@/components/ui/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, useSearchParams } from "next/navigation"
import { useUserStore } from "@/stores/userStore"   // ✅ import store

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useUserStore((state) => state.setUser)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else if (data.session) {
      // ✅ Save user + token to Zustand
      setUser(data.session.user, data.session.access_token)
      
      // Redirect to the original page or default to home
      const redirectTo = searchParams.get('redirect') || '/'
      router.push(redirectTo)
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo size="lg" className="text-balance" showText={false} />
          <CardTitle className="text-balance">Sign in to NIA</CardTitle>
          <CardDescription>AI Sales Assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign In
            </Button>
          </form>
          {error && <p className="mt-2 text-red-600 text-sm">❌ {error}</p>}
          <p className="mt-4 text-xs text-muted-foreground">Use your Supabase auth credentials.</p>
          <div className="mt-4 text-sm">
            <Link href="/leads" className="text-blue-600 hover:underline">
              Continue without login →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

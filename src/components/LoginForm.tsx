"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Replace with your actual authentication logic
      console.log("Login attempt:", { email, password })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // TODO: Add actual authentication
    } catch (err) {
      setError("Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">Sign in to your timetable account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <div className="space-y-3 text-center text-sm">
            <a href="#" className="text-blue-400 hover:text-blue-300 block">
              Forgot password?
            </a>
            <div className="text-slate-400">
              Don't have an account?{" "}
              <a href="#" className="text-blue-400 hover:text-blue-300 font-semibold">
                Sign up
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

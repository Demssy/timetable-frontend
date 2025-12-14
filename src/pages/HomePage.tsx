import React from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 text-white">
      <div className="space-y-6 text-center w-full max-w-2xl">
        <h1 className="text-3xl font-bold">Главная страница</h1>
        <p className="text-slate-300">Добро пожаловать в приложение расписания.</p>

        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-6">
            <CardTitle className="text-xl">Плейсхолдер расписания</CardTitle>
            <CardDescription className="text-slate-400 mb-4">
              Здесь будет отображаться ваше расписание. Пока что это простой
              плейсхолдер, который вы можете заменить на реальную логику позже.
            </CardDescription>

            <div className="flex items-center justify-center">
              <Button asChild>
                <Link to="/login">Перейти на страницу входа</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


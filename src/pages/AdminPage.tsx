import { Link } from "react-router-dom"
import {
  Users,
  GraduationCap,
  ArrowRight,
  CalendarDays,
  BookOpen,
  DoorOpen,
  Clock,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AdminCategory {
  title: string
  description: string
  href: string
  icon: React.ElementType
  available: boolean
}

const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    title: "Users",
    description: "Manage student accounts, roles, and dance levels.",
    href: "/admin/users",
    icon: Users,
    available: true,
  },
  {
    title: "Teachers",
    description: "Manage teacher profiles and their specializations.",
    href: "/admin/teachers",
    icon: GraduationCap,
    available: true,
  },
  {
    title: "Schedules",
    description: "Create and manage weekly timetables. Run the solver.",
    href: "/admin/schedules",
    icon: CalendarDays,
    available: true,
  },
  {
    title: "Lessons",
    description: "Manage planning entities assigned to the solver.",
    href: "/admin/lessons",
    icon: BookOpen,
    available: true,
  },
  {
    title: "Dance Groups",
    description: "Manage groups, levels, and group sizes for lesson planning.",
    href: "/admin/dance-groups",
    icon: Users,
    available: true,
  },
  {
    title: "Rooms",
    description: "Manage dance halls, capacities and constraints.",
    href: "/admin/rooms",
    icon: DoorOpen,
    available: true,
  },
  {
    title: "Timeslots",
    description: "Define weekly time slots available for lessons.",
    href: "/admin/timeslots",
    icon: Clock,
    available: true,
  },
]

export default function AdminPage() {
  return (
    <div className="container mx-auto py-10 space-y-8 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
        <p className="text-slate-400">Select a category to manage.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {ADMIN_CATEGORIES.map((category) => {
          const Icon = category.icon

          const cardContent = (
            <Card
              className={cn(
                "group relative overflow-hidden border border-slate-700 bg-slate-800/50 transition-all duration-200",
                category.available
                  ? "hover:border-slate-500 hover:bg-slate-800 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      category.available
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-700 text-slate-500"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg leading-tight">
                      {category.title}
                    </CardTitle>
                    {!category.available && (
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
                {category.available && (
                  <ArrowRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-slate-300 mt-0.5 shrink-0" />
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400">
                  {category.description}
                </CardDescription>
              </CardContent>
            </Card>
          )

          return category.available ? (
            <Link key={category.href} to={category.href} className="block">
              {cardContent}
            </Link>
          ) : (
            <div key={category.href}>{cardContent}</div>
          )
        })}
      </div>
    </div>
  )
}

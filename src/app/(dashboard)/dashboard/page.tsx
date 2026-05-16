import Link from "next/link";
import { Plus, Rocket, Calendar, Users, Sparkles, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Active Campaigns", value: "3", icon: Rocket, color: "text-blue-600 bg-blue-50" },
    { label: "Total Attendees", value: "142", icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Scheduled Posts", value: "12", icon: Calendar, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="max-w-5xl space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Overview</h1>
          <p className="mt-1 text-zinc-500">
            Welcome back, Senesh. Here's what's happening with your campaigns.
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight text-zinc-950">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-950">Quick Actions</h2>
          <div className="grid gap-4">
            <Link 
              href="/dashboard/campaigns/new"
              className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-violet-600 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-zinc-950">Generate Strategy</p>
                  <p className="text-xs text-zinc-500">AI-powered 2-week marketing plan</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-300 group-hover:text-violet-600 transition-colors" />
            </Link>

            <Link 
              href="/dashboard/calendar"
              className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:border-violet-600 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-900 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-zinc-950">View Calendar</p>
                  <p className="text-xs text-zinc-500">Manage all scheduled content</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-300 group-hover:text-violet-600 transition-colors" />
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-950">Recent Activity</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              {[
                { text: "Campaign 'React Workshop' assets generated", time: "2h ago" },
                { text: "New attendee registered for 'AI Summit'", time: "4h ago" },
                { text: "Strategy drafted for 'SaaS Launch'", time: "Yesterday" },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-violet-600" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{activity.text}</p>
                    <p className="text-xs text-zinc-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link 
              href="/dashboard/campaigns"
              className="mt-8 block text-center text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors"
            >
              View all activity
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

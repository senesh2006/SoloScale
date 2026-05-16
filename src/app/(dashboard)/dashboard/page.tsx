import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-2 text-zinc-600">
        Your command center for campaigns, assets, and events.
      </p>
      <Link
        href="/dashboard/campaigns/new"
        className="mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
      >
        New campaign
      </Link>
    </div>
  );
}

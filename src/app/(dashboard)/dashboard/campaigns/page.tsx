import Link from "next/link";

export default function CampaignsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Link
          href="/dashboard/campaigns/new"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          New campaign
        </Link>
      </div>
      <p className="mt-4 text-sm text-zinc-500">
        Campaign list loads from <code>/api/campaigns</code> after you run{" "}
        <code>npm install</code> and start the dev server.
      </p>
    </div>
  );
}

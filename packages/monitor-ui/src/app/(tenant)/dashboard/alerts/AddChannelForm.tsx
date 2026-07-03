"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddChannelForm() {
  const router = useRouter();
  const [type, setType] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const config: Record<string, string> = {};
    if (type === "email") config.to = form.get("to") as string;
    if (type === "slack" || type === "webhook") config.url = form.get("url") as string;

    const res = await fetch("/api/v1/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), type, config }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Failed to add channel");
      setLoading(false);
      return;
    }

    router.refresh();
    (e.target as HTMLFormElement).reset();
    setLoading(false);
  }

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 font-semibold text-gray-900">Add Channel</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            name="name"
            required
            placeholder="On-call email"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="email">Email</option>
            <option value="slack">Slack Webhook</option>
            <option value="webhook">Custom Webhook</option>
          </select>
        </div>

        {type === "email" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Recipient Email
            </label>
            <input
              name="to"
              type="email"
              required
              placeholder="oncall@example.com"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {(type === "slack" || type === "webhook") && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Webhook URL
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add Channel"}
        </button>
      </form>
    </div>
  );
}

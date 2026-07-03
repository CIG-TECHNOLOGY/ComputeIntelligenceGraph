"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHECK_TYPES = [
  { value: "http", label: "HTTP/HTTPS", placeholder: "https://api.example.com/health" },
  { value: "tcp", label: "TCP", placeholder: "example.com:443" },
  { value: "dns", label: "DNS", placeholder: "example.com" },
  { value: "ssl", label: "SSL Certificate", placeholder: "https://example.com" },
  { value: "ping", label: "ICMP Ping", placeholder: "example.com" },
  { value: "heartbeat", label: "Cron Heartbeat", placeholder: "(auto-generated URL)" },
];

const INTERVALS = [
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 1800, label: "30 minutes" },
];

export default function NewMonitorPage() {
  const router = useRouter();
  const [type, setType] = useState("http");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentType = CHECK_TYPES.find((t) => t.value === type)!;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        type: form.get("type"),
        target: form.get("target"),
        intervalSeconds: Number(form.get("intervalSeconds")),
        expectedStatus: form.get("expectedStatus") ? Number(form.get("expectedStatus")) : undefined,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Failed to create monitor");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Monitor</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
          <input
            name="name"
            required
            placeholder="Production API"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Check Type</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CHECK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {type !== "heartbeat" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Target
            </label>
            <input
              name="target"
              required
              placeholder={currentType.placeholder}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Check Interval
          </label>
          <select
            name="intervalSeconds"
            defaultValue="60"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {INTERVALS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </div>

        {type === "http" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Expected HTTP Status
            </label>
            <input
              name="expectedStatus"
              type="number"
              defaultValue="200"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Monitor"}
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

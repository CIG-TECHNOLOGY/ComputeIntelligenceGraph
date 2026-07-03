"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrgPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        plan: form.get("plan"),
        customDomain: form.get("customDomain") || undefined,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Failed to create organization");
      setLoading(false);
      return;
    }

    const { slug } = await res.json();
    router.push(`/admin/orgs/${slug}`);
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Organization</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            name="name"
            required
            placeholder="Hashpass"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Slug <span className="text-gray-400">(used for subdomain)</span>
          </label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            placeholder="hashpass"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Status page will be at{" "}
            <code>hashpass.status.cig.technology</code>
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Plan
          </label>
          <select
            name="plan"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Custom domain{" "}
            <span className="text-gray-400">(optional, premium)</span>
          </label>
          <input
            name="customDomain"
            placeholder="status.hashpass.tech"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Organization"}
        </button>
      </form>
    </div>
  );
}

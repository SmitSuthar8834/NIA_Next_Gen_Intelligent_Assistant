"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    status: "New",
  });
  const [error, setError] = useState<string | null>(null);

  const addLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // 🔑 get API URL from env
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      // 🔑 get JWT from Supabase session (if backend requires auth)
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${apiUrl}/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to create lead");
        return;
      }

      router.push("/leads");
    } catch (err: any) {
      setError(err.message || "Network error");
    }
  };

  return (
    <main className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">➕ Create New Lead</h1>

      {error && <div className="text-red-600 mb-4">❌ {error}</div>}

      <form onSubmit={addLead} className="space-y-4">
        <input
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 w-full rounded"
          required
        />
        <input
          type="text"
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="border p-2 w-full rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border p-2 w-full rounded"
          required
        />
        <label htmlFor="lead-status" className="block font-medium">
          Status
        </label>
        <select
          id="lead-status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border p-2 w-full rounded"
        >
          <option>New</option>
          <option>Contacted</option>
          <option>Qualified</option>
          <option>Lost</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save Lead
        </button>
      </form>
    </main>
  );
}

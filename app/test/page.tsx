"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, company, plan, created_at");

      if (error) setError(error.message);
      else setUsers(data || []);
    };

    fetchUsers();
  }, []);

  if (error) return <div className="p-6">❌ Error: {error}</div>;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">✅ Supabase Test Page</h1>
      <ul>
        {users.map((u) => (
          <li key={u.id} className="border p-2 mb-2 rounded">
            <b>{u.name}</b> — {u.email} — {u.company} ({u.plan})
          </li>
        ))}
      </ul>
    </main>
  );
}

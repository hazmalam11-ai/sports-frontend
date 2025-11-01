"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

type User = { _id: string; username: string; email: string; role: string; createdAt: string };

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: User[] }>(`/users?search=${encodeURIComponent(search)}`, {}, token);
      setItems(data.items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-[#111]">
      <div className="mx-auto max-w-[1100px] px-3 sm:px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Users</h1>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
            <button onClick={load} className="rounded-lg bg-black text-white px-4 py-2 text-sm">Search</button>
          </div>
        </div>

        {error && <div className="mb-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Username</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id} className="border-t border-gray-100">
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td className="p-4 text-gray-500" colSpan={4}>No users found.</td></tr>
              )}
            </tbody>
          </table>
          {loading && <div className="p-4 text-gray-500">Loading...</div>}
        </div>
      </div>
    </main>
  );
}



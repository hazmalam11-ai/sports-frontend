"use client";

import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Avoid rendering different HTML between server and client
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#f7f9fc] text-[#111] flex items-center justify-center">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow">Unauthorized</div>
      </div>
    );
  }
  return <>{children}</>;
}



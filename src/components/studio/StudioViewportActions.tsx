"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const shell: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 500,
  textDecoration: "none",
  border: "1px solid rgba(140,92,50,0.55)",
  background: "rgba(28,18,8,0.92)",
  color: "#e8d4c8",
  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
  cursor: "pointer",
};

export function StudioViewportActions() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="pointer-events-auto flex flex-col gap-2"
      style={{
        position: "fixed",
        right: 20,
        bottom: 52,
        zIndex: 5200,
      }}
    >
      <Link
        href="/donate"
        style={{ ...shell, width: "100%", justifyContent: "flex-start" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,26,12,0.96)";
          e.currentTarget.style.borderColor = "rgba(200,120,140,0.55)";
          e.currentTarget.style.color = "#f9a8c8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = shell.background as string;
          e.currentTarget.style.borderColor = "rgba(140,92,50,0.55)";
          e.currentTarget.style.color = "#e8d4c8";
        }}
      >
        <Heart style={{ width: 14, height: 14, flexShrink: 0 }} />
        Support us
      </Link>
      <button
        type="button"
        style={{ ...shell, width: "100%", justifyContent: "flex-start" }}
        onClick={() => void handleLogout()}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(40,26,12,0.96)";
          e.currentTarget.style.borderColor = "rgba(180,150,110,0.65)";
          e.currentTarget.style.color = "#fff8f0";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = shell.background as string;
          e.currentTarget.style.borderColor = "rgba(140,92,50,0.55)";
          e.currentTarget.style.color = "#e8d4c8";
        }}
      >
        <LogOut style={{ width: 14, height: 14, flexShrink: 0 }} />
        Sign out
      </button>
    </div>
  );
}

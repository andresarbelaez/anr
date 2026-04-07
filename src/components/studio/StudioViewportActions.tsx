"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { StudioDonateModal } from "@/components/studio/StudioDonateModal";
import { StudioSignOutConfirmModal } from "@/components/studio/StudioSignOutConfirmModal";

export function StudioViewportActions() {
  const router = useRouter();
  const [donateOpen, setDonateOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const performSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSignOutOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div
        className="pointer-events-auto flex flex-col gap-2"
        style={{
          position: "fixed",
          right: 20,
          bottom: 52,
          zIndex: 5200,
        }}
      >
        <Button
          type="button"
          variant="studioViewportSupport"
          onClick={() => setDonateOpen(true)}
        >
          <Heart className="h-3.5 w-3.5 shrink-0" />
          Support us
        </Button>
        <Button
          type="button"
          variant="studioViewportSignOut"
          onClick={() => setSignOutOpen(true)}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          Sign out
        </Button>
      </div>

      <StudioDonateModal open={donateOpen} onClose={() => setDonateOpen(false)} />
      <StudioSignOutConfirmModal
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        onConfirm={performSignOut}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";

export default function CrmNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [lastContacted, setLastContacted] = useState("");
  const [status, setStatus] = useState("active");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("crm_contacts")
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        tiktok: tiktok.trim() || null,
        role: role.trim() || null,
        notes: notes.trim() || null,
        last_contacted_at: lastContacted || null,
        status,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push(`/crm/${data.id}`);
    router.refresh();
  };

  return (
    <div>
      <Link
        href="/crm"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      <h1 className="text-2xl font-bold text-white">New contact</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Save the contact, then add collaborations from the edit screen.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-4">
        {error && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Instagram"
          placeholder="@handle or URL"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <Input
          label="TikTok"
          placeholder="@handle or URL"
          value={tiktok}
          onChange={(e) => setTiktok(e.target.value)}
        />
        <Input
          label="Role"
          placeholder="e.g. Manager, Producer"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={CRM_STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <Input
          label="Last contacted"
          type="date"
          value={lastContacted}
          onChange={(e) => setLastContacted(e.target.value)}
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Free-form notes…"
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving}>
            Create contact
          </Button>
          <Link href="/crm">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

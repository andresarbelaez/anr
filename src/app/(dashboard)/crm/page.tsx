"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { CrmContact } from "@/lib/supabase/types";
import { CRM_STATUS_OPTIONS } from "@/lib/crm-status";

function statusLabel(value: string) {
  return CRM_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export default function CrmPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("updated_at", { ascending: false });

      setContacts((data as CrmContact[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Contacts and relationships for your artist work
          </p>
        </div>
        <Link href="/crm/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New contact
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900">
            <Users className="h-8 w-8 text-neutral-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-white">No contacts yet</h2>
          <p className="mt-1 max-w-sm text-sm text-neutral-400">
            Track collaborators, managers, and other relationships. Link them
            to releases or catalog songs when you work together.
          </p>
          <Link href="/crm/new" className="mt-6">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add your first contact
            </Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last contacted</th>
                <th className="px-4 py-3 font-medium w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.role ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {statusLabel(c.status)}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">
                    {c.last_contacted_at ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/${c.id}`}
                      className="text-white underline-offset-2 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

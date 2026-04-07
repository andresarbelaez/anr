"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CrmNewContactForm } from "@/components/crm/CrmNewContactForm";

export default function CrmNewPage() {
  const router = useRouter();

  return (
    <div>
      <Link
        href="/crm"
        className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CRM
      </Link>

      <CrmNewContactForm
        showTitle
        onSuccess={async (contactId) => {
          router.push(`/crm/${contactId}`);
          router.refresh();
        }}
        onCancel={() => router.push("/crm")}
      />
    </div>
  );
}

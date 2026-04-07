"use client";

import { useRouter } from "next/navigation";
import { NewReleaseWizard } from "@/components/releases/NewReleaseWizard";

export default function NewReleasePage() {
  const router = useRouter();

  return (
    <div>
      <NewReleaseWizard
        onComplete={async (releaseId) => {
          router.push(`/releases/${releaseId}`);
          router.refresh();
        }}
      />
    </div>
  );
}

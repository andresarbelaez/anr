"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const NewReleaseWizard = dynamic(
  () =>
    import("@/components/releases/NewReleaseWizard").then((mod) => ({
      default: mod.NewReleaseWizard,
    })),
  {
    loading: () => (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    ),
  }
);

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

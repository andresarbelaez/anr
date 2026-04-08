"use client";

import dynamic from "next/dynamic";
import { DashboardSettingsPageSkeleton } from "@/components/studio/ui/studio-microapp-skeletons";

const ArtistProfileSettingsForm = dynamic(
  () =>
    import("@/components/settings/ArtistProfileSettingsForm").then((mod) => ({
      default: mod.ArtistProfileSettingsForm,
    })),
  {
    loading: () => <DashboardSettingsPageSkeleton />,
  }
);

export default function SettingsPage() {
  return <ArtistProfileSettingsForm variant="dashboard" />;
}

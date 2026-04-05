import { FeedbackArtistDetailClient } from "@/components/feedback/FeedbackArtistDetailClient";

export default async function FeedbackVersionPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  return <FeedbackArtistDetailClient versionId={versionId} />;
}

import { redirect } from "next/navigation";

/** Legacy detail URL → home with feedback stack opened to this version. */
export default async function FeedbackVersionRedirectPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;
  redirect(`/home?feedbackVersion=${encodeURIComponent(versionId)}`);
}

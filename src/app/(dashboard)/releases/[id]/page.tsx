import { redirect } from "next/navigation";

/** Legacy detail URL → studio with Releases stack opened to this release. */
export default async function ReleaseDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/studio?releaseId=${encodeURIComponent(id)}`);
}

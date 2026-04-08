import { redirect } from "next/navigation";

/** Legacy detail URL → home with Releases stack opened to this release. */
export default async function ReleaseDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/home?releaseId=${encodeURIComponent(id)}`);
}

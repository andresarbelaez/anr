import { redirect } from "next/navigation";

/** Legacy song edit URL → studio with Library stack opened to this song. */
export default async function CatalogSongRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/studio?catalogSongId=${encodeURIComponent(id)}`);
}

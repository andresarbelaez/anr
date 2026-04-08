import { redirect } from "next/navigation";

/** Legacy contact edit URL → home with Contacts stack opened to this contact. */
export default async function CrmContactRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/home?crmContactId=${encodeURIComponent(id)}`);
}

import { redirect } from "next/navigation";

/** Legacy contact edit URL → studio with CRM stack opened to this contact. */
export default async function CrmContactRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/studio?crmContactId=${encodeURIComponent(id)}`);
}

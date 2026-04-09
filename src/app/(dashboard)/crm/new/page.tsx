import { redirect } from "next/navigation";

/** Legacy new-contact URL → home Contacts window (use in-app New contact). */
export default function CrmNewRedirectPage() {
  redirect("/home?open=crm");
}

import { redirect } from "next/navigation";

/** Legacy list URL → home Contacts window. */
export default function CrmRedirectPage() {
  redirect("/home?open=crm");
}

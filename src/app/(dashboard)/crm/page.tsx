import { redirect } from "next/navigation";

/** Legacy list URL → studio CRM window. */
export default function CrmRedirectPage() {
  redirect("/studio?open=crm");
}

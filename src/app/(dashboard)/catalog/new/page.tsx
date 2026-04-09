import { redirect } from "next/navigation";

/** Legacy new-song URL → home Library window (use in-app new song flow). */
export default function CatalogNewRedirectPage() {
  redirect("/home?open=library");
}

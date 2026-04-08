import { redirect } from "next/navigation";

/** Legacy list URL → home Library window. */
export default function CatalogRedirectPage() {
  redirect("/home?open=library");
}

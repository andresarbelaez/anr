import { redirect } from "next/navigation";

/** Legacy list URL → studio Library window. */
export default function CatalogRedirectPage() {
  redirect("/studio?open=library");
}

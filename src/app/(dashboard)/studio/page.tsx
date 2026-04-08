import { redirect } from "next/navigation";

/** Legacy path; canonical room is `/home`. */
export default function StudioRedirectPage() {
  redirect("/home");
}

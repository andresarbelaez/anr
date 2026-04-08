import { redirect } from "next/navigation";

/** Legacy royalties URL → home Royalties window. */
export default function RoyaltiesRedirectPage() {
  redirect("/home?open=royalties");
}

import { redirect } from "next/navigation";

/** Legacy royalties URL → studio Royalties window. */
export default function RoyaltiesRedirectPage() {
  redirect("/studio?open=royalties");
}

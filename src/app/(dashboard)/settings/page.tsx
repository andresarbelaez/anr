import { redirect } from "next/navigation";

/** Legacy profile URL → studio My Profile window. */
export default function SettingsRedirectPage() {
  redirect("/home?open=my-profile");
}

import { redirect } from "next/navigation";

/** Legacy calendar URL → home Calendar window. */
export default function CalendarRedirectPage() {
  redirect("/home?open=calendar");
}

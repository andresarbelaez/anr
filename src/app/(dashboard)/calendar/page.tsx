import { redirect } from "next/navigation";

/** Legacy calendar URL → studio Calendar window. */
export default function CalendarRedirectPage() {
  redirect("/studio?open=calendar");
}

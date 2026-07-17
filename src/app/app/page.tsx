import { format } from "date-fns";
import { redirect } from "next/navigation";

export default function AppIndexPage() {
  const now = new Date();
  redirect(`/app/calendar/${format(now, "yyyy")}/${format(now, "MM")}`);
}

import { notFound } from "next/navigation";
import { CalendarPageClient } from "@/app/app/calendar/[year]/[month]/CalendarPageClient";

type Props = {
  params: Promise<{ year: string; month: string }>;
};

export default async function CalendarMonthPage({ params }: Props) {
  const { year, month } = await params;

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    notFound();
  }

  return <CalendarPageClient year={year} month={month} />;
}

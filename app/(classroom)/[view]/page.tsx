import { notFound, redirect } from "next/navigation";

const views = [
  "dashboard",
  "classes",
  "attendance",
  "random",
  "groups",
  "conversation",
  "scramble",
  "matching",
  "periods",
  "history",
  "scanner",
  "settings",
];

export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  if (view === "periods") redirect("/dashboard#classes");
  return null;
}

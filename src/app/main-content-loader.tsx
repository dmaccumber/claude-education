"use client";

import dynamic from "next/dynamic";

const MainContent = dynamic(
  () => import("./main-content").then((m) => m.MainContent),
  { ssr: false }
);

export function MainContentLoader(
  props: React.ComponentProps<typeof MainContent>
) {
  return <MainContent {...props} />;
}

"use client";

import { type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ScrollytellingScene } from "@/components/marketing/scrollytelling-scene";
import { DynamicBackground } from "@/components/marketing/dynamic-background";
import { CursorGlow } from "@/components/marketing/cursor-glow";

export function BackgroundLayer({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <>
        <ScrollytellingScene />
        <CursorGlow />
        {children}
      </>
    );
  }

  return <DynamicBackground>{children}</DynamicBackground>;
}

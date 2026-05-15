import type { ThemeId } from "./types";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
}

export const THEMES: ThemeMeta[] = [
  { id: "modern", label: "modern", description: "soft dark, cyan/violet accents" },
  { id: "green", label: "green", description: "classic phosphor-green CRT" },
  { id: "amber", label: "amber", description: "retro amber CRT" },
];

export const DEFAULT_THEME: ThemeId = "modern";

export function isThemeId(v: string): v is ThemeId {
  return v === "modern" || v === "green" || v === "amber";
}

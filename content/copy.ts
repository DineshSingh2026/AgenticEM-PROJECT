import { site } from "./copy/site";
import { homeA } from "./copy/home-a";
import { homeB } from "./copy/home-b";
import { pages } from "./copy/pages";
import { intro } from "./copy/intro";

/** Single typed copy object for the whole site. Sub-modules exist only to keep the file editable. */
export const copy = {
  site,
  home: { ...homeA, ...homeB },
  pages,
  intro,
} as const;

export type Copy = typeof copy;

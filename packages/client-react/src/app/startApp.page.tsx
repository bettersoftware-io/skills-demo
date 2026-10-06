import { act } from "react";

import { TESTIDS } from "../ui/testids.ts";
import { startApp } from "./startApp.tsx";

export interface StartedApp {
  heading: () => string | null;
  /** How many rows the price list has. */
  rowCount: () => number;
  /** How many categories and how many users the directory shows. */
  directoryCounts: () => { categories: number; users: number };
  /** True when nothing is drawn in #root. */
  isBlank: () => boolean;
  stop: () => Promise<void>;
}

/** Gives the page a #root, as index.html does, and starts the app in it. */
export async function startAppOnPage(): Promise<StartedApp> {
  document.body.innerHTML = '<div id="root"></div>';

  let stop = (): void => {};

  await act(async () => {
    stop = startApp();
  });

  return {
    heading: (): string | null => document.querySelector("h1")?.textContent ?? null,
    rowCount: (): number => countMarked(TESTIDS.priceRow),
    directoryCounts: () => ({
      categories: countMarked(TESTIDS.categoryRow),
      users: countMarked(TESTIDS.userRow),
    }),
    isBlank: (): boolean => document.getElementById("root")?.childElementCount === 0,
    stop: async (): Promise<void> => {
      await act(async () => {
        stop();
      });
    },
  };
}

/** Leaves the page as a test found it. */
export function clearPage(): void {
  document.body.replaceChildren();
}

function countMarked(testId: string): number {
  return document.querySelectorAll(`[data-testid="${testId}"]`).length;
}

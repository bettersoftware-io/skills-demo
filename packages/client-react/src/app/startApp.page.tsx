import { act } from "react";

import { TESTIDS } from "../ui/testids.ts";
import { startApp } from "./startApp.tsx";

interface DirectoryCounts {
  categories: number;
  users: number;
}

export interface StartedApp {
  heading: () => string | null;
  /** How many rows the price list has. */
  rowCount: () => number;
  /** How many categories and how many users the directory shows. */
  directoryCounts: () => DirectoryCounts;
  /** True when nothing is drawn in #root. */
  isBlank: () => boolean;
  stop: () => Promise<void>;
}

/** Gives the page a #root, as index.html does, and starts the app in it. */
export async function startAppOnPage(): Promise<StartedApp> {
  document.body.innerHTML = '<div id="root"></div>';

  let stop: () => void = stopNothing;

  await act(async () => {
    stop = startApp();
  });

  return {
    heading: (): string | null => {
      return document.querySelector("h1")?.textContent ?? null;
    },
    rowCount: (): number => {
      return countMarked(TESTIDS.priceRow);
    },
    directoryCounts: () => {
      return {
        categories: countMarked(TESTIDS.categoryRow),
        users: countMarked(TESTIDS.userRow),
      };
    },
    isBlank: (): boolean => {
      return document.getElementById("root")?.childElementCount === 0;
    },
    stop: async (): Promise<void> => {
      await act(async () => {
        stop();
      });
    },
  };
}

/** Stands in until the app has started and handed back the real one. */
function stopNothing(): void {}

/** Leaves the page as a test found it. */
export function clearPage(): void {
  document.body.replaceChildren();
}

function countMarked(testId: string): number {
  return document.querySelectorAll(`[data-testid="${testId}"]`).length;
}

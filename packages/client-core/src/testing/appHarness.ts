import { NEVER, Subject, throwError } from "rxjs";

import {
  createDirectorySimulator,
  type DirectoryPort,
  type DirectorySnapshot,
  type Price,
} from "@skills-demo/domain";

import { type App, createApp } from "../composition.ts";

/** The real application on ports a test drives by hand. */
export interface AppHarness {
  app: App;
  /** Delivers a price as if the source had produced it. */
  deliverPrice: (price: Price) => void;
  /**
   * The directory behind the application, for a change made behind the
   * application's back, as another person's would be. It answers at once, so a
   * test never waits for it.
   */
  directory: DirectoryPort;
  /** From now on the directory's lists can be loaded, whatever `directoryLink` said. */
  connectDirectory: () => void;
}

export interface AppHarnessOptions {
  /** What the directory holds when the app starts; nothing, unless a test says otherwise. */
  directory?: DirectorySnapshot;
  /**
   * Whether the directory's lists can be loaded: at once (the default), not at
   * all, or with no answer ever coming.
   */
  directoryLink?: "connected" | "unreachable" | "unanswered";
}

const EMPTY: DirectorySnapshot = { categories: [], users: [] };

/**
 * For tests above the core (bindings, UI): everything real except the outside
 * world. Lives here so those tests need no stream library of their own.
 */
export function createAppHarness({
  directory = EMPTY,
  directoryLink = "connected",
}: AppHarnessOptions = {}): AppHarness {
  const prices$ = new Subject<Price>();
  const kept = createDirectorySimulator(directory);
  let link = directoryLink;

  return {
    app: createApp({
      price: {
        prices: () => {
          return prices$;
        },
      },
      directory: {
        ...kept,
        categories: () => {
          if (link === "connected") {
            return kept.categories();
          }

          return link === "unanswered"
            ? NEVER
            : throwError(() => {
                return new Error("the directory cannot be reached");
              });
        },
      },
    }),
    deliverPrice: (price: Price): void => {
      prices$.next(price);
    },
    directory: kept,
    connectDirectory: (): void => {
      link = "connected";
    },
  };
}

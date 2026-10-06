import type { Page, Response } from "@playwright/test";

import type {
  CategoryDto,
  UserDto,
} from "@skills-demo/shared/directoryProtocol.ts";

import type { ShownUser } from "./Directory.page.ts";

/** What went between the page and the directory's REST API, read off the network and not off the screen. */
export interface DirectoryApiPage {
  /**
   * Every request the page's own code sent to the server, with how it was
   * answered, in order: "POST /api/users 201".
   */
  exchanges: () => string[];
  /** Every request the page's own code sent anywhere else. */
  requestsElsewhere: () => string[];
  /**
   * The users in the lists the server answered last, written the way the user
   * list shows them: in name order, each with the name of its category.
   */
  latestUsers: () => Promise<ShownUser[]>;
}

// The two lists of the API, as packages/shared/src/directoryProtocol.ts gives
// them. This package may import no value of the application, so the paths
// are written here as a client outside the repository would write them.
const CATEGORIES = "/api/categories";
const USERS = "/api/users";

/**
 * Listens to what the page's own code asks over HTTP (`fetch`), from before
 * the page loads. An exchange counts as the server's only when it went to
 * `serverHost` (the server's host and port), so what this reports was
 * answered by that server and by nothing else.
 */
export function watchDirectoryApi(
  page: Page,
  serverHost: string,
): DirectoryApiPage {
  const exchanges: string[] = [];
  const elsewhere: string[] = [];
  const latest = new Map<string, Response>();

  page.on("request", (request) => {
    if (
      request.resourceType() === "fetch" &&
      new URL(request.url()).host !== serverHost
    ) {
      elsewhere.push(`${request.method()} ${request.url()}`);
    }
  });

  page.on("response", (response) => {
    const request = response.request();
    const { host, pathname } = new URL(response.url());

    if (request.resourceType() !== "fetch" || host !== serverHost) {
      return;
    }

    exchanges.push(`${request.method()} ${pathname} ${response.status()}`);

    if (request.method() === "GET" && response.ok()) {
      latest.set(pathname, response);
    }
  });

  /** The body of the latest answer to a list, or nothing while there is none. */
  async function readLatest<T>(path: string): Promise<T[]> {
    const response = latest.get(path);

    return response === undefined ? [] : ((await response.json()) as T[]);
  }

  return {
    exchanges: (): string[] => {
      return [...exchanges];
    },
    requestsElsewhere: (): string[] => {
      return [...elsewhere];
    },
    latestUsers: async (): Promise<ShownUser[]> => {
      const [categories, users] = await Promise.all([
        readLatest<CategoryDto>(CATEGORIES),
        readLatest<UserDto>(USERS),
      ]);

      return users
        .map(({ name, email, categoryId }) => {
          const category = categories.find(({ id }) => {
            return id === categoryId;
          });

          return { name, email, category: category?.name ?? "" };
        })
        .sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
    },
  };
}

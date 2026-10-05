import type { DirectoryPort, Outcome, Refusal } from "@skills-demo/domain";
import {
  API_PATH,
  encodeCategory,
  encodeRefusal,
  encodeUser,
  readCategoryDraft,
  readUserDraft,
  REFUSAL_STATUS,
} from "@skills-demo/shared";
import { firstValueFrom } from "rxjs";

import type { HttpAnswer, HttpRequest, SendRequest } from "../adapters/httpDirectory.ts";

export interface FakeDirectoryServer {
  /** Give this to the adapter in place of `fetch`. */
  send: SendRequest;
  /** Every request received, oldest first, as "METHOD url". */
  requests: string[];
  /** The next request, and only that one, gets this answer instead of the real one. */
  answerNextWith: (status: number, body: unknown) => void;
  /** From now on the server cannot be reached at all. */
  goDown: () => void;
}

/**
 * Stands in for the directory server, so the HTTP adapter is tested without a
 * socket. It speaks the real protocol, with the shared package's own encoders
 * and statuses, over the directory it is given.
 */
export function createFakeDirectoryServer(directory: DirectoryPort, baseUrl: string): FakeDirectoryServer {
  const requests: string[] = [];
  let canned: HttpAnswer | undefined;
  let down = false;

  async function route(method: string, path: string, body: unknown): Promise<HttpAnswer> {
    const match = /^\/api\/(categories|users)(?:\/([^/]+)(?:\/(.+))?)?$/.exec(path) ?? [];
    const [, collection, id, suffix] = match;
    const entry = id === undefined ? undefined : decodeURIComponent(id);
    const key = `${method} ${collection}${entry === undefined ? "" : "/:id"}${suffix === undefined ? "" : `/${suffix}`}`;

    switch (key) {
      case "GET categories":
        return answer(200, (await firstValueFrom(directory.categories())).map(encodeCategory));
      case "POST categories":
        return answerOutcome(await firstValueFrom(directory.addCategory(readCategoryDraft(body))), 201, encodeCategory);
      case "PUT categories/:id":
        return answerOutcome(
          await firstValueFrom(directory.renameCategory(entry!, readCategoryDraft(body))),
          200,
          encodeCategory,
        );
      case "DELETE categories/:id":
        return answerOutcome(await firstValueFrom(directory.removeCategory(entry!)), 204, encodeNothing);
      case "GET users":
        return answer(200, (await firstValueFrom(directory.users())).map(encodeUser));
      case "POST users":
        return answerOutcome(await firstValueFrom(directory.addUser(readUserDraft(body))), 201, encodeUser);
      case "PUT users/:id":
        return answerOutcome(await firstValueFrom(directory.changeUser(entry!, readUserDraft(body))), 200, encodeUser);
      case "DELETE users/:id":
        return answerOutcome(await firstValueFrom(directory.removeUser(entry!)), 204, encodeNothing);
      case "PATCH users/:id/active":
        return answerOutcome(await firstValueFrom(directory.toggleUserActive(entry!)), 200, encodeUser);
      default:
        return answer(404, "404 Not Found");
    }
  }

  return {
    requests,
    send: async (url: string, request: HttpRequest): Promise<HttpAnswer> => {
      requests.push(`${request.method} ${url}`);

      if (down) {
        throw new TypeError("Failed to fetch");
      }

      if (canned !== undefined) {
        const once = canned;

        canned = undefined;

        return once;
      }

      return route(
        request.method,
        url.slice(baseUrl.length),
        request.body === undefined ? null : JSON.parse(request.body),
      );
    },
    answerNextWith: (status: number, body: unknown): void => {
      canned = answer(status, body);
    },
    goDown: (): void => {
      down = true;
    },
  };
}

function answerOutcome<T>(outcome: Outcome<T>, status: number, encode: (value: T) => unknown): HttpAnswer {
  return outcome.accepted ? answer(status, encode(outcome.value)) : answerRefusal(outcome.refusal);
}

function answerRefusal(refusal: Refusal): HttpAnswer {
  return answer(REFUSAL_STATUS[refusal.reason], encodeRefusal(refusal));
}

/** An answer whose body is `body` as JSON. No body at all reads as a failure to parse, as it does in a browser. */
function answer(status: number, body: unknown): HttpAnswer {
  return {
    status,
    json: (): Promise<unknown> =>
      body === undefined ? Promise.reject(new SyntaxError("Unexpected end of JSON input")) : Promise.resolve(body),
  };
}

function encodeNothing(): undefined {
  return undefined;
}

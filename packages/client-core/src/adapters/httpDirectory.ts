import {
  accept,
  type Category,
  type CategoryDraft,
  type DirectoryPort,
  type Outcome,
  type Refusal,
  refuse,
  UNAVAILABLE,
  type User,
  type UserDraft,
} from "@skills-demo/domain";
import {
  API_PATH,
  encodeCategoryDraft,
  encodeUserDraft,
  locateEntry,
  parseCategory,
  parseCategoryList,
  parseRefusal,
  parseUser,
  parseUserList,
} from "@skills-demo/shared";
import { catchError, defer, from, map, type Observable, of } from "rxjs";

/** As much of an HTTP response as the adapter reads. */
export interface HttpAnswer {
  status: number;
  json: () => Promise<unknown>;
}

export interface HttpRequest {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** Sends one HTTP request. The browser's `fetch` is one; a test supplies its own. */
export type SendRequest = (url: string, request: HttpRequest) => Promise<HttpAnswer>;

const NOT_UNDERSTOOD: Refusal = {
  reason: "unavailable",
  field: null,
  message: "The server gave an answer the app does not understand.",
};

/**
 * The real DirectoryPort: categories and users kept by a server, behind its
 * REST API. This is where the wire format is turned into domain terms; nothing
 * past this adapter sees a status code or a response body.
 */
export function createHttpDirectoryPort(
  baseUrl: string,
  send: SendRequest = (url, request) => fetch(url, request),
): DirectoryPort {
  const root = baseUrl.replace(/\/+$/, "");

  /** The answer's status and its body as JSON, or null where there is no JSON. */
  async function ask(method: string, path: string, body?: object): Promise<{ status: number; body: unknown }> {
    const answer = await send(`${root}${path}`, {
      method,
      headers: body === undefined ? { Accept: "application/json" } : JSON_BODY,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return { status: answer.status, body: await answer.json().catch(() => null) };
  }

  function list<T>(path: string, parse: (raw: unknown) => T[] | undefined): Observable<T[]> {
    return defer(() => from(ask("GET", path))).pipe(
      map(({ status, body }) => {
        const listed = status === 200 ? parse(body) : undefined;

        if (listed === undefined) {
          throw new Error(`the directory answered ${status} to GET ${path} with no list the app understands`);
        }

        return listed;
      }),
    );
  }

  function change<T>(
    method: string,
    path: string,
    body: object | undefined,
    parse: (raw: unknown) => T | undefined,
  ): Observable<Outcome<T>> {
    return defer(() => from(ask(method, path, body))).pipe(
      map((answer): Outcome<T> => {
        if (answer.status >= 400) {
          return refuse(parseRefusal(answer.body) ?? NOT_UNDERSTOOD);
        }

        const result = parse(answer.body);

        return result === undefined ? refuse(NOT_UNDERSTOOD) : accept(result);
      }),
      catchError(() => of(refuse(UNAVAILABLE))),
    );
  }

  return {
    categories: (): Observable<Category[]> => list(API_PATH.categories, parseCategoryList),
    users: (): Observable<User[]> => list(API_PATH.users, parseUserList),
    addCategory: (draft: CategoryDraft): Observable<Outcome<Category>> =>
      change("POST", API_PATH.categories, encodeCategoryDraft(draft), parseCategory),
    renameCategory: (id: string, draft: CategoryDraft): Observable<Outcome<Category>> =>
      change("PUT", locateEntry(API_PATH.categories, id), encodeCategoryDraft(draft), parseCategory),
    removeCategory: (id: string): Observable<Outcome<null>> =>
      change("DELETE", locateEntry(API_PATH.categories, id), undefined, parseNothing),
    addUser: (draft: UserDraft): Observable<Outcome<User>> =>
      change("POST", API_PATH.users, encodeUserDraft(draft), parseUser),
    changeUser: (id: string, draft: UserDraft): Observable<Outcome<User>> =>
      change("PUT", locateEntry(API_PATH.users, id), encodeUserDraft(draft), parseUser),
    removeUser: (id: string): Observable<Outcome<null>> =>
      change("DELETE", locateEntry(API_PATH.users, id), undefined, parseNothing),
  };
}

const JSON_BODY = { Accept: "application/json", "Content-Type": "application/json" };

/** A deletion is answered with no body, and there is nothing to read from it. */
function parseNothing(): null {
  return null;
}

import { type DirectoryPort, type Outcome, type Refusal, UNAVAILABLE } from "@skills-demo/domain";
import {
  API_PATH,
  API_ROOT,
  encodeCategory,
  encodeRefusal,
  encodeUser,
  readCategoryDraft,
  readUserDraft,
  REFUSAL_STATUS,
} from "@skills-demo/shared";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { firstValueFrom } from "rxjs";

const NO_SUCH_ADDRESS: Refusal = {
  reason: "not-found",
  field: null,
  message: "There is nothing at this address.",
};

/**
 * The directory's REST API; `directoryProtocol.ts` in the shared package lists
 * the routes. This is the server's adapter: it turns a request into a call on
 * the port and the outcome into a status and a body. It holds no rule of its
 * own, so the server refuses exactly what the simulator in the browser does.
 */
export function createDirectoryApi(directory: DirectoryPort): Hono {
  const api = new Hono();

  // The client is served from another origin (Vite's, in development), and
  // the API has no credentials to protect, so any origin may read it.
  api.use(`${API_ROOT}/*`, cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"] }));

  api.get(API_PATH.categories, async (context) =>
    context.json((await firstValueFrom(directory.categories())).map(encodeCategory)),
  );

  api.post(API_PATH.categories, async (context) =>
    answerWithEntry(
      context,
      await firstValueFrom(directory.addCategory(readCategoryDraft(await readBody(context)))),
      201,
      encodeCategory,
    ),
  );

  api.put(`${API_PATH.categories}/:id`, async (context) =>
    answerWithEntry(
      context,
      await firstValueFrom(
        directory.renameCategory(context.req.param("id"), readCategoryDraft(await readBody(context))),
      ),
      200,
      encodeCategory,
    ),
  );

  api.delete(`${API_PATH.categories}/:id`, async (context) =>
    answerRemoval(context, await firstValueFrom(directory.removeCategory(context.req.param("id")))),
  );

  api.get(API_PATH.users, async (context) => context.json((await firstValueFrom(directory.users())).map(encodeUser)));

  api.post(API_PATH.users, async (context) =>
    answerWithEntry(
      context,
      await firstValueFrom(directory.addUser(readUserDraft(await readBody(context)))),
      201,
      encodeUser,
    ),
  );

  api.put(`${API_PATH.users}/:id`, async (context) =>
    answerWithEntry(
      context,
      await firstValueFrom(directory.changeUser(context.req.param("id"), readUserDraft(await readBody(context)))),
      200,
      encodeUser,
    ),
  );

  api.delete(`${API_PATH.users}/:id`, async (context) =>
    answerRemoval(context, await firstValueFrom(directory.removeUser(context.req.param("id")))),
  );

  api.patch(`${API_PATH.users}/:id/active`, async (context) =>
    answerWithEntry(
      context,
      await firstValueFrom(directory.toggleUserActive(context.req.param("id"))),
      200,
      encodeUser,
    ),
  );

  api.notFound((context) => answerRefusal(context, NO_SUCH_ADDRESS));

  // The port's lists fail when whatever keeps the data cannot be reached.
  api.onError((_error, context) => answerRefusal(context, UNAVAILABLE));

  return api;
}

/** The body as JSON, or null when it is not JSON; the protocol reads null as a blank draft. */
function readBody(context: Context): Promise<unknown> {
  return context.req.json().catch(() => null);
}

function answerWithEntry<T>(
  context: Context,
  outcome: Outcome<T>,
  status: 200 | 201,
  encode: (entry: T) => object,
): Response {
  return outcome.accepted ? context.json(encode(outcome.value), status) : answerRefusal(context, outcome.refusal);
}

function answerRemoval(context: Context, outcome: Outcome<null>): Response {
  return outcome.accepted ? context.body(null, 204) : answerRefusal(context, outcome.refusal);
}

function answerRefusal(context: Context, refusal: Refusal): Response {
  return context.json(encodeRefusal(refusal), REFUSAL_STATUS[refusal.reason]);
}

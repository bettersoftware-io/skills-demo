import {
  type Category,
  type CategoryDraft,
  type Refusal,
  REFUSAL_FIELDS,
  REFUSAL_REASONS,
  type RefusalField,
  type RefusalReason,
  type User,
  type UserDraft,
} from "@skills-demo/domain";

// The directory's REST API: JSON over HTTP.
//
//   GET    /api/categories        200 CategoryDto[]
//   POST   /api/categories        201 CategoryDto         body: CategoryDraftDto
//   PUT    /api/categories/:id    200 CategoryDto         body: CategoryDraftDto
//   DELETE /api/categories/:id    204
//   GET    /api/users             200 UserDto[]
//   POST   /api/users             201 UserDto             body: UserDraftDto
//   PUT    /api/users/:id         200 UserDto             body: UserDraftDto
//   DELETE /api/users/:id         204
//   PATCH  /api/users/:id/active  200 UserDto
//
// A refused change answers with the status in REFUSAL_STATUS and an ErrorBody.

/** Everything the directory API serves lives under this path. */
export const API_ROOT = "/api";

export const API_PATH = {
  categories: `${API_ROOT}/categories`,
  users: `${API_ROOT}/users`,
} as const;

/** The path of one category or one user. */
export function locateEntry(collection: string, id: string): string {
  return `${collection}/${encodeURIComponent(id)}`;
}

/** The HTTP status a refusal travels under. */
export const REFUSAL_STATUS: Record<RefusalReason, 404 | 409 | 422 | 503> = {
  "empty-name": 422,
  "invalid-email": 422,
  "unknown-category": 422,
  "duplicate-name": 409,
  "duplicate-email": 409,
  "category-in-use": 409,
  "not-found": 404,
  unavailable: 503,
};

/** The entities and drafts as they travel on the wire. Kept apart from the
 * domain's so the wire format can change without the domain noticing. */
export interface CategoryDto {
  id: string;
  name: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  active: boolean;
}

export interface CategoryDraftDto {
  name: string;
}

export interface UserDraftDto {
  name: string;
  email: string;
  categoryId: string;
}

export interface RefusalDto {
  reason: RefusalReason;
  field: RefusalField | null;
  message: string;
}

/** The body of every answer that is not a success. */
export interface ErrorBody {
  error: RefusalDto;
}

export function encodeCategory(category: Category): CategoryDto {
  return { id: category.id, name: category.name };
}

export function encodeUser(user: User): UserDto {
  return { id: user.id, name: user.name, email: user.email, categoryId: user.categoryId, active: user.active };
}

export function encodeCategoryDraft(draft: CategoryDraft): CategoryDraftDto {
  return { name: draft.name };
}

export function encodeUserDraft(draft: UserDraft): UserDraftDto {
  return { name: draft.name, email: draft.email, categoryId: draft.categoryId };
}

export function encodeRefusal(refusal: Refusal): ErrorBody {
  return { error: { reason: refusal.reason, field: refusal.field, message: refusal.message } };
}

/** The category, if `raw` is one; otherwise undefined. */
export function parseCategory(raw: unknown): Category | undefined {
  return isRecord(raw) && typeof raw.id === "string" && typeof raw.name === "string"
    ? { id: raw.id, name: raw.name }
    : undefined;
}

/** The user, if `raw` is one; otherwise undefined. */
export function parseUser(raw: unknown): User | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const { id, name, email, categoryId, active } = raw;

  return typeof id === "string" &&
    typeof name === "string" &&
    typeof email === "string" &&
    typeof categoryId === "string" &&
    typeof active === "boolean"
    ? { id, name, email, categoryId, active }
    : undefined;
}

/** The categories, if `raw` is a list of nothing else; otherwise undefined. */
export function parseCategoryList(raw: unknown): Category[] | undefined {
  return parseList(raw, parseCategory);
}

/** The users, if `raw` is a list of nothing else; otherwise undefined. */
export function parseUserList(raw: unknown): User[] | undefined {
  return parseList(raw, parseUser);
}

/** The refusal, if `raw` is an error body this protocol knows; otherwise undefined. */
export function parseRefusal(raw: unknown): Refusal | undefined {
  if (!isRecord(raw) || !isRecord(raw.error)) {
    return undefined;
  }

  const { reason, field, message } = raw.error;
  const knownReason = REFUSAL_REASONS.find((known) => known === reason);
  const knownField = field === null ? null : REFUSAL_FIELDS.find((known) => known === field);

  return knownReason !== undefined && knownField !== undefined && typeof message === "string"
    ? { reason: knownReason, field: knownField, message }
    : undefined;
}

/**
 * The draft a request body holds. Anything that is missing or is not text is
 * read as empty, so a malformed body is refused by the same rules, with the
 * same message, as a form left blank.
 */
export function readCategoryDraft(raw: unknown): CategoryDraft {
  const body = isRecord(raw) ? raw : {};

  return { name: readText(body.name) };
}

/** The draft a request body holds, read as leniently as a category's. */
export function readUserDraft(raw: unknown): UserDraft {
  const body = isRecord(raw) ? raw : {};

  return { name: readText(body.name), email: readText(body.email), categoryId: readText(body.categoryId) };
}

function parseList<T>(raw: unknown, parseOne: (entry: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const parsed = raw.map(parseOne).filter((entry) => entry !== undefined);

  return parsed.length === raw.length ? parsed : undefined;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

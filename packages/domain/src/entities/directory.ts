/** A group every user belongs to exactly one of. */
export interface Category {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  categoryId: string;
}

/** What a person fills in to add or rename a category. */
export type CategoryDraft = Omit<Category, "id">;

/** What a person fills in to add or edit a user. */
export type UserDraft = Omit<User, "id">;

/** Every category and every user, as they are at one moment. */
export interface DirectorySnapshot {
  categories: readonly Category[];
  users: readonly User[];
}

/** Every reason a change can be refused. `unavailable` means nobody judged it: the keeper of the data could not be reached. */
export const REFUSAL_REASONS = [
  "empty-name",
  "invalid-email",
  "unknown-category",
  "duplicate-name",
  "duplicate-email",
  "category-in-use",
  "not-found",
  "unavailable",
] as const;

export type RefusalReason = (typeof REFUSAL_REASONS)[number];

/** The fields of a form a refusal can point at. */
export const REFUSAL_FIELDS = ["name", "email", "category"] as const;

export type RefusalField = (typeof REFUSAL_FIELDS)[number];

/** Why a change was not made, in words a person can read. */
export interface Refusal {
  reason: RefusalReason;
  /** The field that is wrong, or null when the refusal is about the whole change. */
  field: RefusalField | null;
  message: string;
}

/** A change is either made, and here is the result, or refused, and here is why. */
export type Outcome<T> = { accepted: true; value: T } | { accepted: false; refusal: Refusal };

export function accept<T>(value: T): Outcome<T> {
  return { accepted: true, value };
}

export function refuse(refusal: Refusal): Outcome<never> {
  return { accepted: false, refusal };
}

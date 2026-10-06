import type { Category, CategoryDraft, Refusal, User, UserDraft } from "../entities/directory.ts";

// The rules of the directory, as pure functions. Whoever keeps the data (the
// simulator, and through it the server) asks these before it changes anything,
// so the app refuses the same things with or without a server.

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The change could not be judged at all. Adapters answer with this when their source cannot be reached. */
export const UNAVAILABLE: Refusal = {
  reason: "unavailable",
  field: null,
  message: "The server could not be reached. Try again.",
};

export const CATEGORY_NOT_FOUND: Refusal = {
  reason: "not-found",
  field: null,
  message: "This category no longer exists.",
};

export const USER_NOT_FOUND: Refusal = {
  reason: "not-found",
  field: null,
  message: "This user no longer exists.",
};

/** The draft as it is stored: without the spaces around what was typed. */
export function tidyCategoryDraft(draft: CategoryDraft): CategoryDraft {
  return { name: draft.name.trim() };
}

export function tidyUserDraft(draft: UserDraft): UserDraft {
  return { name: draft.name.trim(), email: draft.email.trim(), categoryId: draft.categoryId };
}

/** What is wrong with the draft on its own, before anyone looks at the other categories. */
export function checkCategoryDraft(draft: CategoryDraft): Refusal | null {
  return draft.name.trim() === ""
    ? { reason: "empty-name", field: "name", message: "A category needs a name." }
    : null;
}

/** What is wrong with the draft on its own, before anyone looks at the other users. */
export function checkUserDraft(draft: UserDraft): Refusal | null {
  if (draft.name.trim() === "") {
    return { reason: "empty-name", field: "name", message: "A user needs a name." };
  }

  if (!LOOKS_LIKE_EMAIL.test(draft.email.trim())) {
    return {
      reason: "invalid-email",
      field: "email",
      message: "This does not look like an email address.",
    };
  }

  return draft.categoryId === ""
    ? { reason: "unknown-category", field: "category", message: "Choose a category." }
    : null;
}

/**
 * Why this draft cannot become a category beside `others`, or null if it can.
 * `others` leaves out the category being renamed, so a category may keep its
 * own name.
 */
export function judgeCategoryDraft(
  draft: CategoryDraft,
  others: readonly Category[],
): Refusal | null {
  const name = draft.name.trim();

  return (
    checkCategoryDraft(draft) ??
    (others.some((other) => sameIgnoringCase(other.name, name))
      ? {
          reason: "duplicate-name",
          field: "name",
          message: `There is already a category called "${name}".`,
        }
      : null)
  );
}

/**
 * Why this draft cannot become a user beside `others`, or null if it can.
 * `others` leaves out the user being edited, so a user may keep their own
 * email address.
 */
export function judgeUserDraft(
  draft: UserDraft,
  others: readonly User[],
  categories: readonly Category[],
): Refusal | null {
  const flaw = checkUserDraft(draft);

  if (flaw !== null) {
    return flaw;
  }

  if (!categories.some((category) => category.id === draft.categoryId)) {
    return {
      reason: "unknown-category",
      field: "category",
      message: "This category no longer exists.",
    };
  }

  const email = draft.email.trim();

  return others.some((other) => sameIgnoringCase(other.email, email))
    ? {
        reason: "duplicate-email",
        field: "email",
        message: `Another user already has the email address ${email}.`,
      }
    : null;
}

/** Why this category cannot be deleted, or null if it can: a category that still has users stays. */
export function judgeCategoryRemoval(category: Category, users: readonly User[]): Refusal | null {
  const members = users.filter((user) => user.categoryId === category.id).length;

  if (members === 0) {
    return null;
  }

  return {
    reason: "category-in-use",
    field: null,
    message: `"${category.name}" still has ${members === 1 ? "1 user" : `${members} users`}. Move or delete them first.`,
  };
}

function sameIgnoringCase(one: string, other: string): boolean {
  return one.toLowerCase() === other.toLowerCase();
}

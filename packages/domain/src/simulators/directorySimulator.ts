import { defer, type Observable, of } from "rxjs";

import {
  accept,
  type Category,
  type CategoryDraft,
  type DirectorySnapshot,
  type Outcome,
  refuse,
  type User,
  type UserDraft,
} from "../entities/directory.ts";
import type { DirectoryPort } from "../ports/directoryPort.ts";
import {
  CATEGORY_NOT_FOUND,
  judgeCategoryDraft,
  judgeCategoryRemoval,
  judgeUserDraft,
  tidyCategoryDraft,
  tidyUserDraft,
  USER_NOT_FOUND,
} from "../useCases/directoryRules.ts";

/** What a directory holds when nobody says otherwise: a few categories and users. */
export const SEED_DIRECTORY: DirectorySnapshot = {
  categories: [
    { id: "category-1", name: "Engineering" },
    { id: "category-2", name: "Design" },
    { id: "category-3", name: "Support" },
  ],
  users: [
    { id: "user-1", name: "Ada Lovelace", email: "ada@example.com", categoryId: "category-1" },
    { id: "user-2", name: "Grace Hopper", email: "grace@example.com", categoryId: "category-1" },
    { id: "user-3", name: "Dieter Rams", email: "dieter@example.com", categoryId: "category-2" },
  ],
};

/**
 * A directory kept in memory, with the rules applied. This is production code,
 * not a test double: the app runs on it when no API URL is configured, and the
 * server keeps its data in one.
 *
 * It answers at once, so a caller that subscribes has its answer before
 * `subscribe` returns.
 */
export function createDirectorySimulator(seed: DirectorySnapshot = SEED_DIRECTORY): DirectoryPort {
  let categories: Category[] = seed.categories.map((category) => ({ ...category }));
  let users: User[] = seed.users.map((user) => ({ ...user }));
  // The ids it was seeded with, kept after their entries are deleted. The
  // counter below never goes back, so with these an id is never given out
  // twice, and a reference to a deleted entry cannot come to mean a new one.
  const seeded = new Set([...categories, ...users].map((kept) => kept.id));
  let issued = 0;

  /** An id nothing in the directory has ever had. */
  function issueId(kind: "category" | "user"): string {
    let id: string;

    do {
      issued += 1;
      id = `${kind}-${issued}`;
    } while (seeded.has(id));

    return id;
  }

  function addCategory(draft: CategoryDraft): Outcome<Category> {
    const refusal = judgeCategoryDraft(draft, categories);

    if (refusal !== null) {
      return refuse(refusal);
    }

    const category = { id: issueId("category"), ...tidyCategoryDraft(draft) };

    categories = [...categories, category];

    return accept(category);
  }

  function renameCategory(id: string, draft: CategoryDraft): Outcome<Category> {
    if (!categories.some((category) => category.id === id)) {
      return refuse(CATEGORY_NOT_FOUND);
    }

    const refusal = judgeCategoryDraft(
      draft,
      categories.filter((category) => category.id !== id),
    );

    if (refusal !== null) {
      return refuse(refusal);
    }

    const renamed = { id, ...tidyCategoryDraft(draft) };

    categories = categories.map((category) => (category.id === id ? renamed : category));

    return accept(renamed);
  }

  function removeCategory(id: string): Outcome<null> {
    const category = categories.find((candidate) => candidate.id === id);

    if (category === undefined) {
      return refuse(CATEGORY_NOT_FOUND);
    }

    const refusal = judgeCategoryRemoval(category, users);

    if (refusal !== null) {
      return refuse(refusal);
    }

    categories = categories.filter((candidate) => candidate.id !== id);

    return accept(null);
  }

  function addUser(draft: UserDraft): Outcome<User> {
    const refusal = judgeUserDraft(draft, users, categories);

    if (refusal !== null) {
      return refuse(refusal);
    }

    const user = { id: issueId("user"), ...tidyUserDraft(draft) };

    users = [...users, user];

    return accept(user);
  }

  function changeUser(id: string, draft: UserDraft): Outcome<User> {
    if (!users.some((user) => user.id === id)) {
      return refuse(USER_NOT_FOUND);
    }

    const refusal = judgeUserDraft(
      draft,
      users.filter((user) => user.id !== id),
      categories,
    );

    if (refusal !== null) {
      return refuse(refusal);
    }

    const changed = { id, ...tidyUserDraft(draft) };

    users = users.map((user) => (user.id === id ? changed : user));

    return accept(changed);
  }

  function removeUser(id: string): Outcome<null> {
    if (!users.some((user) => user.id === id)) {
      return refuse(USER_NOT_FOUND);
    }

    users = users.filter((user) => user.id !== id);

    return accept(null);
  }

  return {
    categories: (): Observable<Category[]> =>
      defer(() => of(categories.map((category) => ({ ...category })))),
    users: (): Observable<User[]> => defer(() => of(users.map((user) => ({ ...user })))),
    addCategory: (draft: CategoryDraft): Observable<Outcome<Category>> =>
      defer(() => of(addCategory(draft))),
    renameCategory: (id: string, draft: CategoryDraft): Observable<Outcome<Category>> =>
      defer(() => of(renameCategory(id, draft))),
    removeCategory: (id: string): Observable<Outcome<null>> => defer(() => of(removeCategory(id))),
    addUser: (draft: UserDraft): Observable<Outcome<User>> => defer(() => of(addUser(draft))),
    changeUser: (id: string, draft: UserDraft): Observable<Outcome<User>> =>
      defer(() => of(changeUser(id, draft))),
    removeUser: (id: string): Observable<Outcome<null>> => defer(() => of(removeUser(id))),
  };
}

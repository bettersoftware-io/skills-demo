import {
  type Category,
  type CategoryDraft,
  checkCategoryDraft,
  checkUserDraft,
  type DirectoryPort,
  type Outcome,
  type Refusal,
  refuse,
  type User,
  type UserDraft,
} from "@skills-demo/domain";
import { type DefaultedStateObservable, state } from "@rx-state/core";
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  forkJoin,
  map,
  type Observable,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from "rxjs";

/** One row of the category list, ready to render. */
export interface CategoryRow {
  id: string;
  name: string;
  /** How many users are in the category, whichever category the user list is narrowed to. */
  userCount: number;
}

/** One row of the user list, ready to render. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  categoryId: string;
  categoryName: string;
}

/** The directory screen: nothing is left for the UI to work out. */
export interface DirectoryView {
  /** `unavailable`: the lists could not be loaded. */
  status: "loading" | "ready" | "unavailable";
  /** Every category, in name order. */
  categories: CategoryRow[];
  /** The users of the shown category, or all of them, in name order. */
  users: UserRow[];
  /** The category the user list is narrowed to, or null for every user. */
  shownCategory: string | null;
}

export interface DirectoryPresenter {
  /** Shared: one load, however many readers. */
  view$: DefaultedStateObservable<DirectoryView>;
  /** Narrows the user list to one category, or widens it again with null. */
  showCategory: (id: string | null) => void;
  /** Loads the lists again, for when they could not be loaded. */
  reload: () => void;
  /**
   * The changes. Each does nothing until subscribed, answers once, and brings
   * the lists up to date when it was accepted. A draft that is wrong on its
   * own is refused here and never sent.
   */
  addCategory: (draft: CategoryDraft) => Observable<Outcome<Category>>;
  renameCategory: (id: string, draft: CategoryDraft) => Observable<Outcome<Category>>;
  removeCategory: (id: string) => Observable<Outcome<null>>;
  addUser: (draft: UserDraft) => Observable<Outcome<User>>;
  changeUser: (id: string, draft: UserDraft) => Observable<Outcome<User>>;
  removeUser: (id: string) => Observable<Outcome<null>>;
  /** What an edit of this entry starts from: its values as they are now on screen. */
  categoryDraft: (id: string) => CategoryDraft;
  userDraft: (id: string) => UserDraft;
}

export const BLANK_CATEGORY: CategoryDraft = { name: "" };

export const BLANK_USER: UserDraft = { name: "", email: "", categoryId: "" };

type Loaded = { reached: true; categories: Category[]; users: User[] } | { reached: false };

const LOADING: DirectoryView = { status: "loading", categories: [], users: [], shownCategory: null };

export function createDirectoryPresenter(port: DirectoryPort): DirectoryPresenter {
  const reload$ = new Subject<void>();
  const shown$ = new BehaviorSubject<string | null>(null);

  const loaded$ = reload$.pipe(
    startWith(undefined),
    // The view keeps what it shows until the new lists arrive, so a reload does not flicker.
    switchMap(() =>
      forkJoin([port.categories(), port.users()]).pipe(
        map(([categories, users]): Loaded => ({ reached: true, categories, users })),
        catchError(() => of<Loaded>({ reached: false })),
      ),
    ),
  );

  const view$ = state(
    combineLatest([loaded$, shown$]).pipe(map(([loaded, shown]) => present(loaded, shown))),
    LOADING,
  );

  /** Refuses a flawed draft without asking; otherwise asks, and reloads once the change is made. */
  function perform<T>(flaw: Refusal | null, change: () => Observable<Outcome<T>>): Observable<Outcome<T>> {
    if (flaw !== null) {
      return of(refuse(flaw));
    }

    return change().pipe(
      tap((outcome) => {
        if (outcome.accepted) {
          reload$.next();
        }
      }),
    );
  }

  return {
    view$,
    showCategory: (id): void => {
      shown$.next(id);
    },
    reload: (): void => {
      reload$.next();
    },
    addCategory: (draft) => perform(checkCategoryDraft(draft), () => port.addCategory(draft)),
    renameCategory: (id, draft) => perform(checkCategoryDraft(draft), () => port.renameCategory(id, draft)),
    removeCategory: (id) => perform(null, () => port.removeCategory(id)),
    addUser: (draft) => perform(checkUserDraft(draft), () => port.addUser(draft)),
    changeUser: (id, draft) => perform(checkUserDraft(draft), () => port.changeUser(id, draft)),
    removeUser: (id) => perform(null, () => port.removeUser(id)),
    categoryDraft: (id): CategoryDraft => {
      const row = view$.getValue().categories.find((category) => category.id === id);

      return row === undefined ? BLANK_CATEGORY : { name: row.name };
    },
    userDraft: (id): UserDraft => {
      const row = view$.getValue().users.find((user) => user.id === id);

      return row === undefined ? BLANK_USER : { name: row.name, email: row.email, categoryId: row.categoryId };
    },
  };
}

function present(loaded: Loaded, shown: string | null): DirectoryView {
  if (!loaded.reached) {
    return { ...LOADING, status: "unavailable" };
  }

  const { categories, users } = loaded;
  const nameOf = new Map(categories.map((category) => [category.id, category.name]));
  // A category that has been deleted cannot narrow the list any more.
  const shownCategory = shown !== null && nameOf.has(shown) ? shown : null;

  return {
    status: "ready",
    categories: categories
      .map((category) => ({
        ...category,
        userCount: users.filter((user) => user.categoryId === category.id).length,
      }))
      .sort(byName),
    users: users
      .filter((user) => shownCategory === null || user.categoryId === shownCategory)
      .map((user) => ({ ...user, categoryName: nameOf.get(user.categoryId) ?? "" }))
      .sort(byName),
    shownCategory,
  };
}

function byName(one: { name: string }, other: { name: string }): number {
  return one.name.localeCompare(other.name);
}

import type { Observable } from "rxjs";

import type {
  Category,
  CategoryDraft,
  Outcome,
  User,
  UserDraft,
} from "../entities/directory.ts";

/**
 * Where categories and users are kept. The domain declares this; a simulator
 * and a real transport each implement it, and the composition root picks one.
 *
 * Every method answers once and completes, and does nothing until subscribed.
 * A list fails with an error when the keeper cannot be reached. A change never
 * fails: it is accepted, or refused with the reason.
 */
export interface DirectoryPort {
  categories(): Observable<Category[]>;
  users(): Observable<User[]>;
  addCategory(draft: CategoryDraft): Observable<Outcome<Category>>;
  renameCategory(
    id: string,
    draft: CategoryDraft,
  ): Observable<Outcome<Category>>;
  /** Refused while the category still has users. */
  removeCategory(id: string): Observable<Outcome<null>>;
  addUser(draft: UserDraft): Observable<Outcome<User>>;
  changeUser(id: string, draft: UserDraft): Observable<Outcome<User>>;
  removeUser(id: string): Observable<Outcome<null>>;
}

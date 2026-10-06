import type { CategoryDraft, DirectoryPort, PricePort, UserDraft } from "@skills-demo/domain";

import {
  createAddFormMachine,
  createRowFormMachine,
  type FormIntents,
  type FormState,
  type RowFormIntents,
} from "./machines/formMachine.ts";
import type { Machine } from "./machines/machine.ts";
import {
  createSelectionMachine,
  type SelectionIntents,
  type SelectionState,
} from "./machines/selectionMachine.ts";
import {
  BLANK_CATEGORY,
  BLANK_USER,
  createDirectoryPresenter,
  type DirectoryPresenter,
} from "./presenters/directoryPresenter.ts";
import { createPricesPresenter, type PricesPresenter } from "./presenters/pricesPresenter.ts";

/** Everything the application needs from the outside world. The client's
 * composition root decides what stands behind each port. */
export interface AppPorts {
  price: PricePort;
  directory: DirectoryPort;
}

/** The form that adds a category, and the form of one category in the list. */
export type CategoryFormMachine = Machine<FormState<CategoryDraft>, FormIntents<CategoryDraft>>;
export type CategoryRowMachine = Machine<FormState<CategoryDraft>, RowFormIntents<CategoryDraft>>;

/** The form that adds a user, and the form of one user in the list. */
export type UserFormMachine = Machine<FormState<UserDraft>, FormIntents<UserDraft>>;
export type UserRowMachine = Machine<FormState<UserDraft>, RowFormIntents<UserDraft>>;

/** The application, built once at startup. Presenters are shared; machine
 * factories build one machine per component that asks. */
export interface App {
  presenters: {
    prices: PricesPresenter;
    directory: DirectoryPresenter;
  };
  machines: {
    createSelection: () => Machine<SelectionState, SelectionIntents>;
    createCategoryForm: () => CategoryFormMachine;
    createCategoryRow: (id: string) => CategoryRowMachine;
    createUserForm: () => UserFormMachine;
    createUserRow: (id: string) => UserRowMachine;
  };
}

export function createApp(ports: AppPorts): App {
  const directory = createDirectoryPresenter(ports.directory);

  return {
    presenters: {
      prices: createPricesPresenter(ports.price),
      directory,
    },
    machines: {
      createSelection: createSelectionMachine,
      createCategoryForm: () =>
        createAddFormMachine({ blank: BLANK_CATEGORY, add: directory.addCategory }),
      createCategoryRow: (id: string) =>
        createRowFormMachine({
          current: () => directory.categoryDraft(id),
          save: (draft: CategoryDraft) => directory.renameCategory(id, draft),
          remove: () => directory.removeCategory(id),
        }),
      createUserForm: () => createAddFormMachine({ blank: BLANK_USER, add: directory.addUser }),
      createUserRow: (id: string) =>
        createRowFormMachine({
          current: () => directory.userDraft(id),
          save: (draft: UserDraft) => directory.changeUser(id, draft),
          remove: () => directory.removeUser(id),
        }),
    },
  };
}

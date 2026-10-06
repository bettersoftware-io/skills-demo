import { useStateObservable } from "@react-rxjs/core";

import type {
  App,
  CategoryFormMachine,
  CategoryRowMachine,
  DirectoryView,
  PriceRow,
  SelectionIntents,
  SelectionState,
  UserFormMachine,
  UserRowMachine,
} from "@skills-demo/client-core";

import { type MachineView, useMachine, type ViewOf } from "./useMachine.ts";

/** The directory screen as a component sees it: what to show, and what it can ask for. */
export interface DirectoryScreen extends DirectoryView {
  /** Narrows the user list to one category, or widens it again with null. */
  showCategory: (id: string | null) => void;
  reload: () => void;
}

/**
 * Everything the UI can read or do, as hooks. This is the UI's only door to
 * the application: a component never sees a stream, a port or an adapter.
 */
export interface ViewModel {
  usePrices: () => PriceRow[];
  useSelection: () => MachineView<SelectionState, SelectionIntents>;
  useDirectory: () => DirectoryScreen;
  /** The form that adds a category. One per component that asks. */
  useCategoryForm: () => ViewOf<CategoryFormMachine>;
  /** The form of one category in the list: rename and delete. */
  useCategoryRow: (id: string) => ViewOf<CategoryRowMachine>;
  /** The form that adds a user. One per component that asks. */
  useUserForm: () => ViewOf<UserFormMachine>;
  /** The form of one user in the list: edit and delete. */
  useUserRow: (id: string) => ViewOf<UserRowMachine>;
}

/** Built once at startup, in the composition root, from the application. */
export function createViewModel(app: App): ViewModel {
  const { directory } = app.presenters;

  return {
    usePrices: (): PriceRow[] => useStateObservable(app.presenters.prices.rows$),
    useSelection: (): MachineView<SelectionState, SelectionIntents> =>
      useMachine(app.machines.createSelection),
    useDirectory: (): DirectoryScreen => ({
      ...useStateObservable(directory.view$),
      showCategory: directory.showCategory,
      reload: directory.reload,
    }),
    useCategoryForm: (): ViewOf<CategoryFormMachine> => useMachine(app.machines.createCategoryForm),
    useCategoryRow: (id: string): ViewOf<CategoryRowMachine> =>
      useMachine(() => app.machines.createCategoryRow(id)),
    useUserForm: (): ViewOf<UserFormMachine> => useMachine(app.machines.createUserForm),
    useUserRow: (id: string): ViewOf<UserRowMachine> =>
      useMachine(() => app.machines.createUserRow(id)),
  };
}

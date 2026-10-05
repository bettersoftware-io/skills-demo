import { createAppHarness } from "@skills-demo/client-core/testing/appHarness.ts";
import type { DirectorySnapshot } from "@skills-demo/domain";
import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";

import { createViewModel, type ViewModel } from "./createViewModel.ts";
import { useViewModel } from "./useViewModel.ts";
import { ViewModelProvider } from "./ViewModelProvider.tsx";

export interface DirectoryViewModelPage {
  status: () => string;
  categoryNames: () => string[];
  userNames: () => string[];
  /** What the form that adds a category holds, and why it was last refused. */
  categoryForm: () => { name: string; refusal: string | null };
  /** What the form that adds a user holds, and why it was last refused. */
  userForm: () => { name: string; refusal: string | null };
  /** Whether the row forms of the first category and the first user are open. */
  openRows: () => { category: boolean; user: boolean };
  addCategory: (name: string) => Promise<void>;
  renameFirstCategory: (name: string) => Promise<void>;
  addUser: (name: string, email: string) => Promise<void>;
  editFirstUser: () => Promise<void>;
  removeFirstUser: () => Promise<void>;
  showFirstCategory: () => Promise<void>;
  reload: () => Promise<void>;
}

/** Two categories and one user. */
const SEED: DirectorySnapshot = {
  categories: [
    { id: "design", name: "Design" },
    { id: "eng", name: "Engineering" },
  ],
  users: [{ id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true }],
};

/**
 * Mounts a component that reads everything the view model offers of the
 * directory, under a provider, on the real application.
 */
export function mountDirectoryUnderProvider(): DirectoryViewModelPage {
  const seen: { current?: Seen } = {};

  render(
    <ViewModelProvider viewModel={createViewModel(createAppHarness({ directory: SEED }).app)}>
      <Reader seen={seen} />
    </ViewModelProvider>,
  );

  function current(): Seen {
    if (seen.current === undefined) {
      throw new Error("the directory reader has not rendered");
    }

    return seen.current;
  }

  async function send(use: (now: Seen) => void): Promise<void> {
    await act(async () => {
      use(current());
    });
  }

  return {
    status: (): string => current().directory.status,
    categoryNames: (): string[] => current().directory.categories.map((category) => category.name),
    userNames: (): string[] => current().directory.users.map((user) => user.name),
    categoryForm: () => describeForm(current().categoryForm.state),
    userForm: () => describeForm(current().userForm.state),
    openRows: () => ({
      category: current().categoryRow.state.open,
      user: current().userRow.state.open,
    }),
    addCategory: async (name): Promise<void> => {
      await send((now) => now.categoryForm.change({ name }));
      await send((now) => now.categoryForm.save());
    },
    renameFirstCategory: async (name): Promise<void> => {
      await send((now) => now.categoryRow.edit());
      await send((now) => now.categoryRow.change({ name }));
      await send((now) => now.categoryRow.save());
    },
    addUser: async (name, email): Promise<void> => {
      await send((now) => now.userForm.change({ name, email, categoryId: "design" }));
      await send((now) => now.userForm.save());
    },
    editFirstUser: (): Promise<void> => send((now) => now.userRow.edit()),
    removeFirstUser: (): Promise<void> => send((now) => now.userRow.remove()),
    showFirstCategory: (): Promise<void> => send((now) => now.directory.showCategory("design")),
    reload: (): Promise<void> => send((now) => now.directory.reload()),
  };
}

interface Seen {
  directory: ReturnType<ViewModel["useDirectory"]>;
  categoryForm: ReturnType<ViewModel["useCategoryForm"]>;
  categoryRow: ReturnType<ViewModel["useCategoryRow"]>;
  userForm: ReturnType<ViewModel["useUserForm"]>;
  userRow: ReturnType<ViewModel["useUserRow"]>;
}

function describeForm(state: {
  draft: { name: string };
  refusal: { message: string } | null;
}): { name: string; refusal: string | null } {
  return { name: state.draft.name, refusal: state.refusal?.message ?? null };
}

function Reader({ seen }: { seen: { current?: Seen } }): ReactElement {
  const viewModel = useViewModel();

  seen.current = {
    directory: viewModel.useDirectory(),
    categoryForm: viewModel.useCategoryForm(),
    categoryRow: viewModel.useCategoryRow("design"),
    userForm: viewModel.useUserForm(),
    userRow: viewModel.useUserRow("ada"),
  };

  return <output />;
}

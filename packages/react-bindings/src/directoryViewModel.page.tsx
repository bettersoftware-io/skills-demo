import { act, render } from "@testing-library/react";
import type { ReactElement } from "react";

import { createAppHarness } from "@skills-demo/client-core/testing/appHarness.ts";

import { createViewModel, type ViewModel } from "./createViewModel.ts";
import { useViewModel } from "./useViewModel.ts";
import { ViewModelProvider } from "./ViewModelProvider.tsx";

/** What a form holds, and why it was last refused. */
interface FormSeen {
  name: string;
  refusal: string | null;
}

interface OpenRows {
  category: boolean;
  user: boolean;
}

export interface DirectoryViewModelPage {
  status: () => string;
  categoryNames: () => string[];
  userNames: () => string[];
  /** What the form that adds a category holds, and why it was last refused. */
  categoryForm: () => FormSeen;
  /** What the form that adds a user holds, and why it was last refused. */
  userForm: () => FormSeen;
  /** Whether the row forms of the first category and the first user are open. */
  openRows: () => OpenRows;
  addCategory: (name: string) => Promise<void>;
  renameFirstCategory: (name: string) => Promise<void>;
  addUser: (name: string, email: string) => Promise<void>;
  editFirstUser: () => Promise<void>;
  removeFirstUser: () => Promise<void>;
  showFirstCategory: () => Promise<void>;
  reload: () => Promise<void>;
}

/** Two categories and one user; this package does not depend on the domain, so they are written out here. */
const SEED = {
  categories: [
    { id: "design", name: "Design" },
    { id: "eng", name: "Engineering" },
  ],
  users: [
    { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng" },
  ],
};

/**
 * Mounts a component that reads everything the view model offers of the
 * directory, under a provider, on the real application.
 */
export function mountDirectoryUnderProvider(): DirectoryViewModelPage {
  const seen: SeenHolder = {};

  render(
    <ViewModelProvider
      viewModel={createViewModel(createAppHarness({ directory: SEED }).app)}
    >
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
    status: (): string => {
      return current().directory.status;
    },
    categoryNames: (): string[] => {
      return current().directory.categories.map((category) => {
        return category.name;
      });
    },
    userNames: (): string[] => {
      return current().directory.users.map((user) => {
        return user.name;
      });
    },
    categoryForm: () => {
      return describeForm(current().categoryForm.state);
    },
    userForm: () => {
      return describeForm(current().userForm.state);
    },
    openRows: () => {
      return {
        category: current().categoryRow.state.open,
        user: current().userRow.state.open,
      };
    },
    addCategory: async (name: string): Promise<void> => {
      await send((now) => {
        return now.categoryForm.change({ name });
      });
      await send((now) => {
        return now.categoryForm.save();
      });
    },
    renameFirstCategory: async (name: string): Promise<void> => {
      await send((now) => {
        return now.categoryRow.edit();
      });
      await send((now) => {
        return now.categoryRow.change({ name });
      });
      await send((now) => {
        return now.categoryRow.save();
      });
    },
    addUser: async (name: string, email: string): Promise<void> => {
      await send((now) => {
        return now.userForm.change({ name, email, categoryId: "design" });
      });
      await send((now) => {
        return now.userForm.save();
      });
    },
    editFirstUser: (): Promise<void> => {
      return send((now) => {
        return now.userRow.edit();
      });
    },
    removeFirstUser: (): Promise<void> => {
      return send((now) => {
        return now.userRow.remove();
      });
    },
    showFirstCategory: (): Promise<void> => {
      return send((now) => {
        return now.directory.showCategory("design");
      });
    },
    reload: (): Promise<void> => {
      return send((now) => {
        return now.directory.reload();
      });
    },
  };
}

interface Seen {
  directory: ReturnType<ViewModel["useDirectory"]>;
  categoryForm: ReturnType<ViewModel["useCategoryForm"]>;
  categoryRow: ReturnType<ViewModel["useCategoryRow"]>;
  userForm: ReturnType<ViewModel["useUserForm"]>;
  userRow: ReturnType<ViewModel["useUserRow"]>;
}

/** Where the reader leaves what it last read, for the page object to pick up. */
interface SeenHolder {
  current?: Seen;
}

interface Named {
  name: string;
}

interface Explained {
  message: string;
}

interface DescribedForm {
  draft: Named;
  refusal: Explained | null;
}

function describeForm(state: DescribedForm): FormSeen {
  return { name: state.draft.name, refusal: state.refusal?.message ?? null };
}

interface ReaderProps {
  seen: SeenHolder;
}

function Reader({ seen }: ReaderProps): ReactElement {
  const {
    useDirectory,
    useCategoryForm,
    useCategoryRow,
    useUserForm,
    useUserRow,
  } = useViewModel();

  seen.current = {
    directory: useDirectory(),
    categoryForm: useCategoryForm(),
    categoryRow: useCategoryRow("design"),
    userForm: useUserForm(),
    userRow: useUserRow("ada"),
  };

  return <output />;
}

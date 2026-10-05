import { createAppHarness } from "@skills-demo/client-core/testing/appHarness.ts";
import type { DirectorySnapshot, RefusalField } from "@skills-demo/domain";
import { createViewModel, ViewModelProvider } from "@skills-demo/react-bindings";
import { act, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TESTIDS } from "./testids.ts";
import { UserList } from "./UserList.tsx";

/** What a person types into a user form. A field that is left out is left as it is. */
export interface TypedUser {
  name?: string;
  email?: string;
  /** The category's name, as the choice shows it. */
  category?: string;
}

/** What a test can do with, and ask of, the user list. */
export interface UserListPage {
  /** Each row as it reads, such as "Ada, ada@example.com, Engineering", in order. */
  rows: () => string[];
  /** The categories the list can be narrowed to, as the choice shows them. */
  categoryChoices: () => string[];
  /** Narrows the list to the category of this name; "All categories" widens it again. */
  show: (category: string) => Promise<void>;
  add: (typed: TypedUser) => Promise<void>;
  /** What the fields of the add form hold. */
  newUser: () => Required<TypedUser>;
  /** The message next to the add form, if there is one. */
  addRefusal: () => string | null;
  /** The fields of the add form that are marked as wrong. */
  invalidNewFields: () => RefusalField[];
  /** Opens the user's edit form and says what its fields start with. */
  startEdit: (name: string) => Promise<Required<TypedUser>>;
  edit: (name: string, typed: TypedUser) => Promise<void>;
  cancelEdit: (name: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
  /** The message on the row of this user, if there is one. */
  refusalOn: (name: string) => string | null;
  /** How many messages are on screen, wherever they are. */
  refusalCount: () => number;
  /** Someone else deletes the user of this id; the screen is not told. */
  removeBehindTheScreen: (id: string) => void;
  /** Whether the "Show inactive users" checkbox is checked. */
  showsInactive: () => boolean;
  /** Toggles the "Show inactive users" checkbox. */
  toggleShowInactive: () => Promise<void>;
  /** Toggles a user's active status. */
  toggleActive: (name: string) => Promise<void>;
  /** The active status of a user. */
  isActive: (name: string) => boolean;
}

/**
 * Mounts the user list on the real application, over a directory that holds
 * what the test says. The test says what happens; how the screen is driven
 * stays here.
 */
export function mountUserList(directory: DirectorySnapshot): UserListPage {
  const harness = createAppHarness({ directory });
  const user = userEvent.setup();

  const rendered = render(
    <ViewModelProvider viewModel={createViewModel(harness.app)}>
      <UserList />
    </ViewModelProvider>,
  );

  function findRows(): HTMLElement[] {
    return rendered.queryAllByTestId(TESTIDS.userRow);
  }

  /** The row of the user, whether it shows them or the form that edits them. */
  function findRow(name: string): HTMLElement {
    const row = findRows().find(
      (candidate) =>
        within(candidate).queryByRole("rowheader", { name: new RegExp(name) }) !== null ||
        within(candidate).queryByRole("form", { name: `Edit ${name}` }) !== null,
    );

    if (row === undefined) {
      throw new Error(`no row for the user ${name}`);
    }

    return row;
  }

  function findAddForm(): HTMLElement {
    return rendered.getByTestId(TESTIDS.userForm);
  }

  async function replaceText(field: HTMLElement, text: string): Promise<void> {
    await user.clear(field);

    if (text !== "") {
      await user.type(field, text);
    }
  }

  async function fill(form: HTMLElement, typed: TypedUser): Promise<void> {
    if (typed.name !== undefined) {
      await replaceText(within(form).getByRole("textbox", { name: "Name" }), typed.name);
    }

    if (typed.email !== undefined) {
      await replaceText(within(form).getByRole("textbox", { name: "Email" }), typed.email);
    }

    if (typed.category !== undefined) {
      await user.selectOptions(within(form).getByRole("combobox", { name: "Category" }), typed.category);
    }
  }

  async function startEdit(name: string): Promise<Required<TypedUser>> {
    await user.click(within(findRow(name)).getByRole("button", { name: `Edit ${name}` }));

    return readFields(findRow(name));
  }

  return {
    rows: (): string[] =>
      findRows().map((row) =>
        [within(row).getByRole("rowheader"), ...within(row).getAllByRole("cell").slice(0, 2)].map(readText).join(", "),
      ),
    categoryChoices: (): string[] =>
      within(rendered.getByRole("combobox", { name: "Show" })).getAllByRole("option").map(readText),
    show: async (category): Promise<void> => {
      await user.selectOptions(rendered.getByRole("combobox", { name: "Show" }), category);
    },
    add: async (typed): Promise<void> => {
      await fill(findAddForm(), typed);
      await user.click(within(findAddForm()).getByRole("button", { name: "Add user" }));
    },
    newUser: (): Required<TypedUser> => readFields(findAddForm()),
    addRefusal: (): string | null => readRefusal(findAddForm()),
    invalidNewFields: (): RefusalField[] => {
      const form = within(findAddForm());
      const fields: [RefusalField, HTMLElement][] = [
        ["name", form.getByRole("textbox", { name: "Name" })],
        ["email", form.getByRole("textbox", { name: "Email" })],
        ["category", form.getByRole("combobox", { name: "Category" })],
      ];

      return fields.filter(([, field]) => field.getAttribute("aria-invalid") === "true").map(([name]) => name);
    },
    startEdit,
    edit: async (name, typed): Promise<void> => {
      await startEdit(name);
      await fill(findRow(name), typed);
      await user.click(within(findRow(name)).getByRole("button", { name: "Save" }));
    },
    cancelEdit: async (name): Promise<void> => {
      await user.click(within(findRow(name)).getByRole("button", { name: "Cancel" }));
    },
    remove: async (name): Promise<void> => {
      await user.click(within(findRow(name)).getByRole("button", { name: `Delete ${name}` }));
    },
    refusalOn: (name): string | null => readRefusal(findRow(name)),
    refusalCount: (): number => rendered.queryAllByTestId(TESTIDS.refusal).length,
    removeBehindTheScreen: (id): void => {
      act(() => {
        harness.directory.removeUser(id).subscribe();
      });
    },
    showsInactive: (): boolean => {
      const checkbox = rendered.getByRole("checkbox", { name: "Show inactive users" });
      return (checkbox as HTMLInputElement).checked;
    },
    toggleShowInactive: async (): Promise<void> => {
      await user.click(rendered.getByRole("checkbox", { name: "Show inactive users" }));
    },
    toggleActive: async (name): Promise<void> => {
      const button = within(findRow(name)).getByRole("button", {
        name: (accessible) => accessible.includes(name) && (accessible.includes("Deactivate") || accessible.includes("Reactivate")),
      });
      await user.click(button);
    },
    isActive: (name): boolean => {
      const rows = findRows();
      const row = rows.find(
        (candidate) =>
          within(candidate).queryByRole("rowheader", { name: new RegExp(name) }) !== null,
      );
      if (!row) {
        throw new Error(`no row for the user ${name}`);
      }
      const header = within(row).getByRole("rowheader");
      return !(header.textContent?.includes("Inactive") ?? false);
    },
  };
}

function readFields(form: HTMLElement): Required<TypedUser> {
  const category = within(form).getByRole<HTMLSelectElement>("combobox", { name: "Category" });

  return {
    name: within(form).getByRole<HTMLInputElement>("textbox", { name: "Name" }).value,
    email: within(form).getByRole<HTMLInputElement>("textbox", { name: "Email" }).value,
    category: category.selectedOptions[0]?.textContent ?? "",
  };
}

function readRefusal(area: HTMLElement): string | null {
  return within(area).queryByTestId(TESTIDS.refusal)?.textContent ?? null;
}

function readText(element: HTMLElement): string {
  return element.textContent ?? "";
}

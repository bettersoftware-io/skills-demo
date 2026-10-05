import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createAppHarness } from "@skills-demo/client-core/testing/appHarness.ts";
import type { DirectorySnapshot } from "@skills-demo/domain";
import { createViewModel, ViewModelProvider } from "@skills-demo/react-bindings";

import { CategoryList } from "./CategoryList.tsx";
import { TESTIDS } from "./testids.ts";

/** What a test can do with, and ask of, the category list. */
export interface CategoryListPage {
  /** Each row as it reads, such as "Design, 2 users", in order. */
  rows: () => string[];
  add: (name: string) => Promise<void>;
  /** What the field of the add form holds. */
  newName: () => string;
  /** The message next to the add form, if there is one. */
  addRefusal: () => string | null;
  /** Whether the add form's field is marked as the one that is wrong. */
  newNameIsMarkedInvalid: () => boolean;
  rename: (from: string, to: string) => Promise<void>;
  /** Opens the rename form of the category, types the name, and leaves the form open. */
  typeRename: (from: string, to: string) => Promise<void>;
  cancelRename: (name: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
  /** The message on the row of this category, if there is one. */
  refusalOn: (name: string) => string | null;
  /** How many messages are on screen, wherever they are. */
  refusalCount: () => number;
}

/**
 * Mounts the category list on the real application, over a directory that
 * holds what the test says. The test says what happens; how the screen is
 * driven stays here.
 */
export function mountCategoryList(directory: DirectorySnapshot): CategoryListPage {
  const harness = createAppHarness({ directory });
  const user = userEvent.setup();

  const rendered = render(
    <ViewModelProvider viewModel={createViewModel(harness.app)}>
      <CategoryList />
    </ViewModelProvider>,
  );

  function findRows(): HTMLElement[] {
    return rendered.queryAllByTestId(TESTIDS.categoryRow);
  }

  /** The row of the category, whether it shows the name or the form that renames it. */
  function findRow(name: string): HTMLElement {
    const row = findRows().find(
      (candidate) =>
        within(candidate).queryByText(name, { selector: "strong" }) !== null ||
        within(candidate).queryByRole("form", { name: `Rename ${name}` }) !== null,
    );

    if (row === undefined) {
      throw new Error(`no row for the category ${name}`);
    }

    return row;
  }

  function findAddForm(): HTMLElement {
    return rendered.getByTestId(TESTIDS.categoryForm);
  }

  async function typeRename(from: string, to: string): Promise<void> {
    const row = findRow(from);

    await user.click(within(row).getByRole("button", { name: `Rename ${from}` }));

    const field = within(row).getByRole("textbox", { name: "Name" });

    await user.clear(field);

    if (to !== "") {
      await user.type(field, to);
    }
  }

  return {
    rows: (): string[] =>
      findRows().map((row) =>
        within(row).getAllByText(/./, { selector: "strong, .count" }).map(readText).join(", "),
      ),
    add: async (name: string): Promise<void> => {
      const field = within(findAddForm()).getByRole("textbox", { name: "New category" });

      await user.clear(field);

      if (name !== "") {
        await user.type(field, name);
      }

      await user.click(within(findAddForm()).getByRole("button", { name: "Add category" }));
    },
    newName: (): string =>
      within(findAddForm()).getByRole<HTMLInputElement>("textbox", { name: "New category" }).value,
    addRefusal: (): string | null => readRefusal(findAddForm()),
    newNameIsMarkedInvalid: (): boolean =>
      within(findAddForm())
        .getByRole("textbox", { name: "New category" })
        .getAttribute("aria-invalid") === "true",
    typeRename,
    rename: async (from: string, to: string): Promise<void> => {
      await typeRename(from, to);
      await user.click(within(findRow(from)).getByRole("button", { name: "Save" }));
    },
    cancelRename: async (name: string): Promise<void> => {
      await user.click(within(findRow(name)).getByRole("button", { name: "Cancel" }));
    },
    remove: async (name: string): Promise<void> => {
      await user.click(within(findRow(name)).getByRole("button", { name: `Delete ${name}` }));
    },
    refusalOn: (name: string): string | null => readRefusal(findRow(name)),
    refusalCount: (): number => rendered.queryAllByTestId(TESTIDS.refusal).length,
  };
}

function readRefusal(area: HTMLElement): string | null {
  return within(area).queryByTestId(TESTIDS.refusal)?.textContent ?? null;
}

function readText(element: HTMLElement): string {
  return element.textContent ?? "";
}

import type { Locator, Page } from "@playwright/test";

import { TESTIDS } from "@skills-demo/client-react/src/ui/testids.ts";

/** One row of the user list, as a user reads it. */
export interface ShownUser {
  name: string;
  email: string;
  /** The name of the user's category. */
  category: string;
}

/** One entry of the category list, as a user reads it. */
interface ShownCategory {
  name: string;
  /** How many users it has, as written: "1 user", "2 users". */
  users: string;
  /** Why its last change was refused, or null when nothing is said. */
  refusal: string | null;
}

/** What a spec can do with, and ask of, the users and their categories. */
export interface DirectoryPage {
  open: () => Promise<void>;
  /**
   * Loads the page afresh. Whatever the page kept in its own memory is gone,
   * so what is on screen afterwards was given to it again.
   */
  reopen: () => Promise<void>;
  /** Every user row, read in one step, so the list cannot change between two rows. */
  users: () => Promise<ShownUser[]>;
  /** Every category, read in one step. */
  categories: () => Promise<ShownCategory[]>;
  /** The category of this name, or null while the list has none. */
  categoryNamed: (name: string) => Promise<ShownCategory | null>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
  addUser: (user: ShownUser) => Promise<void>;
  /** Opens the user's edit form, types what is given over what is there, and saves. */
  changeUser: (name: string, typed: Partial<ShownUser>) => Promise<void>;
  deleteUser: (name: string) => Promise<void>;
}

export function createDirectoryPage(page: Page): DirectoryPage {
  const userList = page.getByTestId(TESTIDS.userList);
  const everyUser = userList.getByTestId(TESTIDS.userRow);
  const categoryList = page.getByTestId(TESTIDS.categoryList);
  const everyCategory = categoryList.getByTestId(TESTIDS.categoryRow);

  /** Types into the three fields of a user form; a field that is not given is left as it is. */
  async function typeUser(
    form: Locator,
    { name, email, category }: Partial<ShownUser>,
  ): Promise<void> {
    if (name !== undefined) {
      await form.getByLabel("Name").fill(name);
    }

    if (email !== undefined) {
      await form.getByLabel("Email").fill(email);
    }

    if (category !== undefined) {
      await form.getByLabel("Category").selectOption({ label: category });
    }
  }

  async function readCategories(): Promise<ShownCategory[]> {
    return everyCategory.evaluateAll((elements) => {
      return elements.map((element) => {
        return {
          name: element.querySelector("strong")?.textContent ?? "",
          users: element.querySelector("span")?.textContent ?? "",
          refusal: element.querySelector('[role="alert"]')?.textContent ?? null,
        };
      });
    });
  }

  return {
    open: async (): Promise<void> => {
      await page.goto("/");
      await userList.waitFor();
    },
    reopen: async (): Promise<void> => {
      await page.reload();
      await userList.waitFor();
    },
    users: async (): Promise<ShownUser[]> => {
      return everyUser.evaluateAll((elements) => {
        return elements.map((element) => {
          const [email, category] = element.querySelectorAll("td");

          return {
            name: element.querySelector("th")?.textContent ?? "",
            email: email?.textContent ?? "",
            category: category?.textContent ?? "",
          };
        });
      });
    },
    categories: readCategories,
    categoryNamed: async (name: string): Promise<ShownCategory | null> => {
      const categories = await readCategories();

      return (
        categories.find((category) => {
          return category.name === name;
        }) ?? null
      );
    },
    addCategory: async (name: string): Promise<void> => {
      const form = page.getByTestId(TESTIDS.categoryForm);

      await form.getByLabel("New category").fill(name);
      await form.getByRole("button", { name: "Add category" }).click();
    },
    deleteCategory: async (name: string): Promise<void> => {
      await categoryList
        .getByRole("button", { name: `Delete ${name}`, exact: true })
        .click();
    },
    addUser: async (user: ShownUser): Promise<void> => {
      const form = page.getByTestId(TESTIDS.userForm);

      await typeUser(form, user);
      await form.getByRole("button", { name: "Add user" }).click();
    },
    changeUser: async (
      name: string,
      typed: Partial<ShownUser>,
    ): Promise<void> => {
      await userList
        .getByRole("button", { name: `Edit ${name}`, exact: true })
        .click();

      const form = userList.getByRole("form", { name: `Edit ${name}` });

      await typeUser(form, typed);
      await form.getByRole("button", { name: "Save" }).click();
    },
    deleteUser: async (name: string): Promise<void> => {
      await userList
        .getByRole("button", { name: `Delete ${name}`, exact: true })
        .click();
    },
  };
}

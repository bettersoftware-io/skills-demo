import { type Observable, Subject, throwError } from "rxjs";
import { describe, expect, it } from "vitest";

import {
  type Category,
  createDirectorySimulator,
  type DirectoryPort,
  type DirectorySnapshot,
  type Outcome,
} from "@skills-demo/domain";

import {
  createDirectoryPresenter,
  type DirectoryPresenter,
  type DirectoryView,
} from "./directoryPresenter.ts";

describe("the directory presenter: what it shows", () => {
  it("is loading until someone reads it", () => {
    const presenter = createDirectoryPresenter(createDirectorySimulator(SEED));

    expect(presenter.view$.getValue()).toEqual({
      status: "loading",
      categories: [],
      users: [],
      shownCategory: null,
    });
  });

  it("lists the categories in name order, each with how many users it has", () => {
    const { latest } = createPresented();

    expect(latest().status).toBe("ready");
    expect(latest().categories).toEqual([
      { id: "design", name: "Design", userCount: 1 },
      { id: "eng", name: "Engineering", userCount: 2 },
      { id: "ops", name: "Operations", userCount: 0 },
    ]);
  });

  it("lists the users in name order, each with the name of their category", () => {
    const { latest } = createPresented();

    expect(latest().users).toEqual([
      {
        id: "ada",
        name: "Ada",
        email: "ada@example.com",
        categoryId: "eng",
        categoryName: "Engineering",
      },
      {
        id: "dieter",
        name: "Dieter",
        email: "dieter@example.com",
        categoryId: "design",
        categoryName: "Design",
      },
      {
        id: "grace",
        name: "Grace",
        email: "grace@example.com",
        categoryId: "eng",
        categoryName: "Engineering",
      },
    ]);
  });

  it("narrows the users to one category, and widens the list again", () => {
    const { presenter, latest } = createPresented();

    presenter.showCategory("eng");
    expect(latest().shownCategory).toBe("eng");
    expect(
      latest().users.map((user) => {
        return user.name;
      }),
    ).toEqual(["Ada", "Grace"]);
    expect(
      latest().categories.map((category) => {
        return category.userCount;
      }),
    ).toEqual([1, 2, 0]);

    presenter.showCategory(null);
    expect(latest().shownCategory).toBeNull();
    expect(latest().users).toHaveLength(3);
  });

  it("shows every user again once the category the list was narrowed to is deleted", () => {
    const { presenter, latest } = createPresented();

    presenter.showCategory("ops");
    expect(latest().users).toEqual([]);

    presenter.removeCategory("ops").subscribe();

    expect(latest().shownCategory).toBeNull();
    expect(latest().users).toHaveLength(3);
  });

  it("loads once however many readers there are", () => {
    const { presenter, asked } = createPresented();

    presenter.view$.subscribe();

    expect(asked.lists).toBe(1);
  });
});

describe("the directory presenter: changes", () => {
  it("brings the lists up to date once a change is accepted", () => {
    const { presenter, latest } = createPresented();

    presenter.addCategory({ name: "Billing" }).subscribe();
    presenter.renameCategory("ops", { name: "Support" }).subscribe();
    presenter
      .addUser({ name: "Linus", email: "linus@example.com", categoryId: "ops" })
      .subscribe();
    presenter
      .changeUser("ada", {
        name: "Ada Lovelace",
        email: "ada@example.com",
        categoryId: "design",
      })
      .subscribe();
    presenter.removeUser("grace").subscribe();

    expect(
      latest().categories.map((category) => {
        return `${category.name} ${category.userCount}`;
      }),
    ).toEqual(["Billing 0", "Design 2", "Engineering 0", "Support 1"]);
    expect(
      latest().users.map((user) => {
        return `${user.name}, ${user.categoryName}`;
      }),
    ).toEqual(["Ada Lovelace, Design", "Dieter, Design", "Linus, Support"]);
  });

  it("does nothing until the change is subscribed to", () => {
    const { presenter, latest } = createPresented();

    presenter.removeUser("ada");

    expect(latest().users).toHaveLength(3);
  });

  it("hands the outcome to whoever asked for the change", () => {
    const { presenter } = createPresented();

    expect(answerOf(presenter.addCategory({ name: "Billing" }))).toEqual({
      accepted: true,
      value: { id: expect.any(String), name: "Billing" },
    });
    expect(answerOf(presenter.removeCategory("eng"))).toEqual({
      accepted: false,
      refusal: {
        reason: "category-in-use",
        field: null,
        message: '"Engineering" still has 2 users. Move or delete them first.',
      },
    });
  });

  it("refuses a draft that is wrong on its own without sending it", () => {
    const { presenter, asked } = createPresented();
    const linus = {
      name: "Linus",
      email: "linus@example.com",
      categoryId: "ops",
    };

    expect(answerOf(presenter.addCategory({ name: " " }))).toMatchObject({
      refusal: { reason: "empty-name" },
    });
    expect(
      answerOf(presenter.renameCategory("ops", { name: "" })),
    ).toMatchObject({
      refusal: { reason: "empty-name", field: "name" },
    });
    expect(
      answerOf(presenter.addUser({ ...linus, email: "linus" })),
    ).toMatchObject({
      refusal: { reason: "invalid-email", field: "email" },
    });
    expect(
      answerOf(presenter.changeUser("ada", { ...linus, categoryId: "" })),
    ).toMatchObject({
      refusal: { reason: "unknown-category", field: "category" },
    });
    expect(asked.changes).toBe(0);
  });

  it("leaves the lists alone when a change is refused", () => {
    const { presenter, asked } = createPresented();

    presenter.addCategory({ name: "design" }).subscribe();

    expect(asked.changes).toBe(1);
    expect(asked.lists).toBe(1);
  });

  it("keeps showing the lists it has while newer ones are on their way", () => {
    const answers$ = new Subject<Category[]>();
    let asked = 0;
    const presenter = createDirectoryPresenter({
      ...createDirectorySimulator(SEED),
      categories: () => {
        asked += 1;

        return asked === 1
          ? createDirectorySimulator(SEED).categories()
          : answers$;
      },
    });
    const seen: DirectoryView[] = [];

    presenter.view$.subscribe((view) => {
      return seen.push(view);
    });
    presenter.reload();

    expect(
      seen.map((view) => {
        return view.status;
      }),
    ).toEqual(["ready"]);

    answers$.next([{ id: "solo", name: "Solo" }]);
    answers$.complete();

    expect(
      seen.map((view) => {
        return view.categories.length;
      }),
    ).toEqual([3, 1]);
  });
});

describe("the directory presenter: a directory that cannot be reached", () => {
  it("says the lists are unavailable, and shows none", () => {
    const { latest } = createPresented(createFlakyDirectory().port);

    expect(latest()).toEqual({
      status: "unavailable",
      categories: [],
      users: [],
      shownCategory: null,
    });
  });

  it("loads them when asked again, once the directory can be reached", () => {
    const flaky = createFlakyDirectory();
    const { presenter, latest } = createPresented(flaky.port);

    flaky.recover();
    presenter.reload();

    expect(latest().status).toBe("ready");
    expect(latest().users).toHaveLength(3);
  });
});

describe("the directory presenter: what an edit starts from", () => {
  it("is the entry as it is on screen now", () => {
    const { presenter } = createPresented();

    presenter.renameCategory("ops", { name: "Support" }).subscribe();

    expect(presenter.categoryDraft("ops")).toEqual({ name: "Support" });
    expect(presenter.userDraft("ada")).toEqual({
      name: "Ada",
      email: "ada@example.com",
      categoryId: "eng",
    });
  });

  it("is blank for an entry that is not on screen", () => {
    const { presenter } = createPresented();

    expect(presenter.categoryDraft("sales")).toEqual({ name: "" });
    expect(presenter.userDraft("linus")).toEqual({
      name: "",
      email: "",
      categoryId: "",
    });
  });
});

/** Three categories, one of them empty, and three users. Neither list is in name order. */
const SEED: DirectorySnapshot = {
  categories: [
    { id: "ops", name: "Operations" },
    { id: "eng", name: "Engineering" },
    { id: "design", name: "Design" },
  ],
  users: [
    {
      id: "grace",
      name: "Grace",
      email: "grace@example.com",
      categoryId: "eng",
    },
    {
      id: "dieter",
      name: "Dieter",
      email: "dieter@example.com",
      categoryId: "design",
    },
    { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng" },
  ],
};

interface Presented {
  presenter: DirectoryPresenter;
  latest: () => DirectoryView;
  /** How often the port was asked: for both lists together, and for a change. */
  asked: { lists: number; changes: number };
}

/** The presenter with one reader, on a directory that counts what it is asked. */
function createPresented(
  directory: DirectoryPort = createDirectorySimulator(SEED),
): Presented {
  const asked = { lists: 0, changes: 0 };

  function countChange<TArguments extends unknown[], TAnswer>(
    change: (...given: TArguments) => TAnswer,
  ): (...given: TArguments) => TAnswer {
    return (...given) => {
      asked.changes += 1;

      return change(...given);
    };
  }

  const presenter = createDirectoryPresenter({
    categories: () => {
      asked.lists += 1;

      return directory.categories();
    },
    users: directory.users,
    addCategory: countChange(directory.addCategory),
    renameCategory: countChange(directory.renameCategory),
    removeCategory: countChange(directory.removeCategory),
    addUser: countChange(directory.addUser),
    changeUser: countChange(directory.changeUser),
    removeUser: countChange(directory.removeUser),
  });
  let view = presenter.view$.getValue();

  presenter.view$.subscribe((next) => {
    view = next;
  });

  return {
    presenter,
    latest: () => {
      return view;
    },
    asked,
  };
}

interface FlakyDirectory {
  port: DirectoryPort;
  recover: () => void;
}

/** A directory whose user list fails until it recovers. */
function createFlakyDirectory(): FlakyDirectory {
  const directory = createDirectorySimulator(SEED);
  let reachable = false;

  return {
    port: {
      ...directory,
      users: () => {
        return reachable
          ? directory.users()
          : throwError(() => {
              return new Error("the directory cannot be reached");
            });
      },
    },
    recover: (): void => {
      reachable = true;
    },
  };
}

/** What the change answered. The simulator answers before `subscribe` returns. */
function answerOf<T>(change: Observable<Outcome<T>>): Outcome<T> | undefined {
  let outcome: Outcome<T> | undefined;

  change.subscribe((answered) => {
    outcome = answered;
  });

  return outcome;
}

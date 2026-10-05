import type { DirectorySnapshot, Price, UserDraft } from "@skills-demo/domain";

/**
 * One picture: a name and the state the screen is in when it is taken. The
 * state is data, never a click. The visual host turns it into deliveries on
 * the app harness, so the real presenters decide what the rows look like.
 */
export interface Scenario {
  /**
   * Prices that arrived long enough ago for their rows to have gone stale.
   * Delivered first, in order; then the stale wait passes on the host's clock.
   */
  stalePrices?: readonly Price[];
  /**
   * Prices that have just arrived, in order. A second price for a symbol shows
   * as a movement against the first.
   */
  prices: readonly Price[];
  /** The symbol of the row that is selected. */
  selected?: string;
  /** The categories and users the directory holds. None, unless the scenario says otherwise. */
  directory?: DirectorySnapshot;
  /** The id of a category whose delete has just been asked for. With users in it, its row shows the refusal. */
  categoryAskedToDelete?: string;
  /** What has been typed into the form that adds a user, and sent. A draft the rules refuse stays, with the reason. */
  userSent?: UserDraft;
}

/** Two symbols that have each moved once: EURUSD up, GBPUSD down. */
const MOVES: readonly Price[] = [
  { symbol: "EURUSD", mid: 1.1 },
  { symbol: "GBPUSD", mid: 1.25 },
  { symbol: "EURUSD", mid: 1.1012 },
  { symbol: "GBPUSD", mid: 1.2488 },
];

const USDJPY: Price = { symbol: "USDJPY", mid: 151.2 };

/** Three categories, one of them empty, and three users. */
const PEOPLE: DirectorySnapshot = {
  categories: [
    { id: "design", name: "Design" },
    { id: "eng", name: "Engineering" },
    { id: "support", name: "Support" },
  ],
  users: [
    { id: "ada", name: "Ada Lovelace", email: "ada@example.com", categoryId: "eng", active: true },
    { id: "dieter", name: "Dieter Rams", email: "dieter@example.com", categoryId: "design", active: true },
    { id: "grace", name: "Grace Hopper", email: "grace@example.com", categoryId: "eng", active: true },
  ],
};

/**
 * Every scenario, keyed by name. The name is the golden's file name
 * (`goldens/<platform>/<name>.png`) and the test's title, so keep it short,
 * lower-case and dashed. Each scenario needs a golden on every platform that
 * runs the tier; `pnpm visual` says which are missing.
 */
export const scenarios = {
  empty: {
    prices: [],
  },
  "rows-up-and-down": {
    prices: [...MOVES, USDJPY],
  },
  "row-selected": {
    prices: [...MOVES, USDJPY],
    selected: "GBPUSD",
  },
  "row-stale": {
    stalePrices: [USDJPY],
    prices: MOVES,
  },
  "directory-listed": {
    prices: [],
    directory: PEOPLE,
  },
  "category-delete-refused": {
    prices: [],
    directory: PEOPLE,
    categoryAskedToDelete: "eng",
  },
  "user-email-refused": {
    prices: [],
    directory: PEOPLE,
    userSent: { name: "Linus Torvalds", email: "linus.example.com", categoryId: "support" },
  },
} satisfies Record<string, Scenario>;

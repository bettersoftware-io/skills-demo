import type { CategoryRow, PriceRow } from "@skills-demo/client-core";
import {
  checkUserDraft,
  type DirectorySnapshot,
  type Price,
  type Refusal,
  type RefusalField,
  type UserDraft,
} from "@skills-demo/domain";

import type { Picture } from "./host/picture.ts";

/**
 * One picture: a name and the state the screen is in when it is taken. The
 * state is data, never a click. The visual host turns it into deliveries on
 * the app harness, so the real presenters decide what the rows look like.
 *
 * The fields of `Picture` say what is pictured: `level`, `mount` (a key of
 * `registry.tsx`; none is the whole app), `capture`, `width`, `height` and the
 * tolerance. A scenario with none of them is a page: the whole app in a
 * 1920x1080 viewport.
 */
export interface Scenario extends Picture {
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
  /** Whether the directory's lists can be loaded: at once (the default), not at all, or with no answer ever coming. */
  directoryLink?: "connected" | "unreachable" | "unanswered";
  /** The id of a category whose delete has just been asked for. With users in it, its row shows the refusal. */
  categoryAskedToDelete?: string;
  /** The id of a category whose row has its rename form open. */
  categoryRenaming?: string;
  /** What has been typed into the form that adds a user, and sent. A draft the rules refuse stays, with the reason. */
  userSent?: UserDraft;
  /** The id of a user whose row has its edit form open. */
  userEditing?: string;

  /** The row a `price-row` mount shows, as the presenter hands it over. */
  row?: PriceRow;
  /** The refusal a `refusal-message` mount shows. */
  refusal?: Refusal | null;
  /** What a `user-fields` mount shows: the draft, the categories to choose from, and the field a refusal points at. */
  fields?: {
    draft: UserDraft;
    categories: CategoryRow[];
    invalid: RefusalField | null;
  };
  /** The category a `members-dialog` mount shows, as the presenter hands it over. */
  category?: CategoryRow;
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
    {
      id: "ada",
      name: "Ada Lovelace",
      email: "ada@example.com",
      categoryId: "eng",
    },
    {
      id: "dieter",
      name: "Dieter Rams",
      email: "dieter@example.com",
      categoryId: "design",
    },
    {
      id: "grace",
      name: "Grace Hopper",
      email: "grace@example.com",
      categoryId: "eng",
    },
  ],
};

/** PEOPLE's categories as the category list shows them, for a mount that takes them as props. */
const CATEGORY_ROWS: CategoryRow[] = [
  {
    id: "design",
    name: "Design",
    userCount: 1,
    members: [{ id: "dieter", name: "Dieter Rams" }],
  },
  {
    id: "eng",
    name: "Engineering",
    userCount: 2,
    members: [
      { id: "ada", name: "Ada Lovelace" },
      { id: "grace", name: "Grace Hopper" },
    ],
  },
  { id: "support", name: "Support", userCount: 0, members: [] },
];

/** A user the rules refuse: the email has no @. */
const LINUS: UserDraft = {
  name: "Linus Torvalds",
  email: "linus.example.com",
  categoryId: "support",
};

/** A category with more members than its dialog's list shows at once, so the list scrolls. */
const CROWDED: CategoryRow = {
  id: "eng",
  name: "Engineering",
  userCount: 14,
  members: [
    "Ada Lovelace",
    "Alan Kay",
    "Barbara Liskov",
    "Dennis Ritchie",
    "Donald Knuth",
    "Edsger Dijkstra",
    "Frances Allen",
    "Grace Hopper",
    "John Backus",
    "Ken Thompson",
    "Leslie Lamport",
    "Margaret Hamilton",
    "Niklaus Wirth",
    "Tony Hoare",
  ].map((name) => {
    return { id: name.toLowerCase().replace(" ", "-"), name };
  }),
};

/**
 * The window a dialog is pictured in: an even width. The card is 305 pixels
 * wide and centred by a transform, so it sits on a half pixel, with rounded
 * corners, and its list scrolls inside a fixed layer: the two things that,
 * in condo-ledger, would not hold still from one frame to the next.
 */
const DIALOG_WINDOW = { width: 800, height: 600 } as const;

/**
 * Every scenario, keyed by name. The name is the golden's file name
 * (`goldens/<platform>/<name>.png`) and the test's title, so keep it short,
 * lower-case and dashed, and start it with what is pictured. Each scenario
 * needs a golden on every platform that runs the tier; `pnpm visual` says
 * which are missing.
 *
 * The shape to keep is a pyramid. Many components, one scenario for each state
 * that matters. A few sections, for how the parts sit together. A page or two,
 * for the whole app at a size that matters.
 */
export const scenarios: Record<string, Scenario> = {
  // Components: one price row, from props, in each state the presenter gives one.
  "price-row-up": {
    level: "component",
    mount: "price-row",
    prices: [],
    row: { symbol: "EURUSD", mid: 1.1012, movement: "up", stale: false },
  },
  "price-row-down": {
    level: "component",
    mount: "price-row",
    prices: [],
    row: { symbol: "GBPUSD", mid: 1.2488, movement: "down", stale: false },
  },
  "price-row-flat": {
    level: "component",
    mount: "price-row",
    prices: [],
    row: { symbol: "USDJPY", mid: 151.2, movement: "flat", stale: false },
  },
  "price-row-selected": {
    level: "component",
    mount: "price-row",
    prices: [],
    row: { symbol: "GBPUSD", mid: 1.2488, movement: "down", stale: false },
    selected: "GBPUSD",
  },
  "price-row-stale": {
    level: "component",
    mount: "price-row",
    prices: [],
    row: { symbol: "USDJPY", mid: 151.2, movement: "flat", stale: true },
  },
  "price-list-empty": {
    level: "component",
    mount: "price-list",
    prices: [],
  },

  // Components: the reason a change was refused, as the rules word it.
  "refusal-message": {
    level: "component",
    mount: "refusal-message",
    prices: [],
    refusal: checkUserDraft(LINUS),
  },

  // Components: the fields of a user, blank, and with each kind of field marked.
  "user-fields-blank": {
    level: "component",
    mount: "user-fields",
    prices: [],
    fields: {
      draft: { name: "", email: "", categoryId: "" },
      categories: CATEGORY_ROWS,
      invalid: null,
    },
  },
  "user-fields-email-refused": {
    level: "component",
    mount: "user-fields",
    prices: [],
    fields: { draft: LINUS, categories: CATEGORY_ROWS, invalid: "email" },
  },
  "user-fields-category-refused": {
    level: "component",
    mount: "user-fields",
    prices: [],
    fields: {
      draft: { ...LINUS, email: "linus@example.com", categoryId: "" },
      categories: CATEGORY_ROWS,
      invalid: "category",
    },
  },

  // Components: the directory while its lists are not there.
  "directory-loading": {
    level: "component",
    mount: "directory",
    prices: [],
    directoryLink: "unanswered",
  },
  "directory-unavailable": {
    level: "component",
    mount: "directory",
    prices: [],
    directoryLink: "unreachable",
  },

  // Components: a category's members, a dialog mounted alone and pictured as
  // the window it is drawn against.
  "members-dialog-long": {
    level: "component",
    mount: "members-dialog",
    capture: "viewport",
    ...DIALOG_WINDOW,
    prices: [],
    category: CROWDED,
  },
  "members-dialog-empty": {
    level: "component",
    mount: "members-dialog",
    capture: "viewport",
    ...DIALOG_WINDOW,
    prices: [],
    category: { id: "support", name: "Support", userCount: 0, members: [] },
  },

  // Sections: the lists on the real presenters, their rows side by side.
  "price-list-moving": {
    level: "section",
    mount: "price-list",
    prices: [...MOVES, USDJPY],
  },
  "category-list-listed": {
    level: "section",
    mount: "category-list",
    prices: [],
    directory: PEOPLE,
  },
  "category-list-delete-refused": {
    level: "section",
    mount: "category-list",
    prices: [],
    directory: PEOPLE,
    categoryAskedToDelete: "eng",
  },
  "category-list-renaming": {
    level: "section",
    mount: "category-list",
    prices: [],
    directory: PEOPLE,
    categoryRenaming: "support",
  },
  "user-list-listed": {
    level: "section",
    mount: "user-list",
    width: 960,
    prices: [],
    directory: PEOPLE,
  },
  "user-list-editing": {
    level: "section",
    mount: "user-list",
    width: 960,
    prices: [],
    directory: PEOPLE,
    userEditing: "grace",
  },
  "user-list-email-refused": {
    level: "section",
    mount: "user-list",
    width: 960,
    prices: [],
    directory: PEOPLE,
    userSent: LINUS,
  },
  // How the two lists sit together.
  "directory-listed": {
    level: "section",
    mount: "directory",
    width: 1280,
    prices: [],
    directory: PEOPLE,
  },

  // Pages: the whole app, at the framing's window and at a phone's.
  app: {
    prices: [...MOVES, USDJPY],
    selected: "GBPUSD",
    directory: PEOPLE,
  },
  "app-narrow": {
    width: 390,
    height: 844,
    prices: [...MOVES, USDJPY],
    directory: PEOPLE,
  },
};

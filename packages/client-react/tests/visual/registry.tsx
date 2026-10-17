import type { ReactElement, ReactNode } from "react";

import { CategoryList } from "#/ui/CategoryList.tsx";
import { Directory } from "#/ui/Directory.tsx";
import { MembersDialog } from "#/ui/MembersDialog.tsx";
import { PriceList } from "#/ui/PriceList.tsx";
import { PriceRow } from "#/ui/PriceRow.tsx";
import { RefusalMessage } from "#/ui/RefusalMessage.tsx";
import { UserFields } from "#/ui/UserFields.tsx";
import { UserList } from "#/ui/UserList.tsx";

import type { Scenario } from "./scenarios.ts";

// What a scenario's `mount` names: the parts of the UI that are pictured on
// their own. This file is the project's. A new component gets an entry here,
// and its states get scenarios in `scenarios.ts`.
//
// An entry turns a scenario into an element. A leaf takes its props from the
// scenario. A section reads the view model, whose state the seeding puts in
// through the harness, as it does for the whole app.
//
// The directory's parts are styled under `.directory` in index.css, which the
// app puts around them. An entry for one of them puts the same element around
// it, so it is drawn as it is in the app.

/** Turns a scenario into the element it pictures. */
type Entry = (scenario: Scenario) => ReactElement;

const registry: Record<string, Entry> = {
  "price-row": (scenario: Scenario): ReactElement => {
    return (
      <table>
        <tbody>
          <PriceRow
            row={required(scenario, "row", scenario.row)}
            selected={scenario.selected === scenario.row?.symbol}
            onSelect={ignore}
          />
        </tbody>
      </table>
    );
  },
  "price-list": (): ReactElement => {
    return <PriceList />;
  },
  "refusal-message": (scenario: Scenario): ReactElement => {
    return (
      <RefusalMessage
        refusal={required(scenario, "refusal", scenario.refusal)}
      />
    );
  },
  "user-fields": (scenario: Scenario): ReactElement => {
    const fields = required(scenario, "fields", scenario.fields);

    return (
      <div className="directory">
        <form aria-label="Add a user">
          <UserFields
            draft={fields.draft}
            categories={fields.categories}
            invalid={fields.invalid}
            onChange={ignore}
          />
        </form>
      </div>
    );
  },
  "members-dialog": (scenario: Scenario): ReactElement => {
    return (
      <MembersDialog
        category={required(scenario, "category", scenario.category)}
        onClose={ignore}
      />
    );
  },
  directory: (): ReactElement => {
    return <Directory />;
  },
  "category-list": (): ReactElement => {
    return (
      <div className="directory">
        <CategoryList />
      </div>
    );
  },
  "user-list": (): ReactElement => {
    return (
      <div className="directory">
        <UserList />
      </div>
    );
  },
};

interface SurroundProps {
  children: ReactNode;
}

/**
 * What the app puts around everything it draws: its theme providers and the
 * attributes its styles read, without its layout. skills-demo's theme is
 * `index.css` alone, which the host loads, so this passes its children
 * through.
 */
function Surround({ children }: SurroundProps): ReactElement {
  return <>{children}</>;
}

interface MountProps {
  scenario: Scenario;
}

/** The entry a scenario's `mount` names, in the app's surround. */
export function Mount({ scenario }: MountProps): ReactElement {
  const key = scenario.mount ?? "";
  const entry: Entry | undefined = registry[key];

  if (entry === undefined) {
    throw new Error(
      `No entry "${key}" in registry.tsx. Its entries: ${Object.keys(registry).join(", ")}`,
    );
  }

  return <Surround>{entry(scenario)}</Surround>;
}

/** The field a leaf's props come from. A scenario that mounts the leaf without it is a mistake, said by name. */
function required<T>(
  scenario: Scenario,
  field: string,
  value: T | undefined,
): T {
  if (value === undefined) {
    throw new Error(
      `A "${scenario.mount ?? ""}" mount shows the scenario's \`${field}\`, and this one has none.`,
    );
  }

  return value;
}

/** A picture is never clicked or typed into. */
function ignore(): void {
  // Nothing to do.
}

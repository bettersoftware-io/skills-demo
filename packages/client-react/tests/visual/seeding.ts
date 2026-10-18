import { createElement } from "react";

import type { App as Application } from "@skills-demo/client-core";
import { STALE_AFTER_MS } from "@skills-demo/client-core/presenters/pricesPresenter.ts";
import {
  type AppHarness,
  createAppHarness,
} from "@skills-demo/client-core/testing/appHarness.ts";

import type { HostClock, Seeded } from "./host/seeded.ts";
import { Mount } from "./registry.tsx";
import type { Scenario } from "./scenarios.ts";

// How a scenario's data becomes app state. This file is the project's: when a
// feature adds a field to `Scenario`, the lines that deliver it go here. The
// host (`host/`) belongs to the add-on and never needs an edit for a feature:
// it owns the clock, calls `deliver` once the UI has subscribed, and says when
// the picture may be taken.
//
// Two places to put state, and a rule for choosing:
//
// - `app`: what must be true before the first render. A port that answers
//   from memory is given its data when the harness is built; a machine is
//   wrapped so that each one built already holds the scenario's value, set
//   through its own intent.
// - `deliver`: what arrives after the UI is on screen, in order. A wait is
//   `clock.tick(...)`, never a real one.
//
// What is shown is `render`: the registry entry a scenario names in its
// `mount`, in the app's surround (`Mount`, in `registry.tsx`). With no `mount`
// it is undefined, and the host shows the whole app.

/** The application and the deliveries of one scenario. Called once, before the first render. */
export function seedScenario(scenario: Scenario, clock: HostClock): Seeded {
  // The directory answers at once and from memory, so it is on screen before
  // the frame says it is ready; or never, or with a failure, if the scenario says so.
  const harness = createAppHarness({
    directory: scenario.directory,
    directoryLink: scenario.directoryLink,
  });

  return {
    app: editUserFromTheStart(
      sendUserFromTheStart(
        renameFromTheStart(
          askToDeleteFromTheStart(
            selectFromTheStart(harness.app, scenario.selected),
            scenario.categoryAskedToDelete,
          ),
          scenario.categoryRenaming,
        ),
        scenario.userSent,
      ),
      scenario.userEditing,
    ),
    render:
      scenario.mount === undefined
        ? undefined
        : () => {
            return createElement(Mount, { scenario });
          },
    deliver: () => {
      deliverAll(harness, scenario.stalePrices ?? []);

      if (scenario.stalePrices !== undefined) {
        clock.tick(STALE_AFTER_MS);
      }

      deliverAll(harness, scenario.prices);
    },
  };
}

function deliverAll(
  { deliverPrice }: AppHarness,
  prices: Scenario["prices"],
): void {
  for (const price of prices) {
    deliverPrice(price);
  }
}

/**
 * The application, with every selection machine it builds already holding the
 * scenario's selection. The selection is set through the machine's own intent,
 * so the picture shows what a click would have produced without a click.
 */
function selectFromTheStart(
  app: Application,
  symbol: string | undefined,
): Application {
  if (symbol === undefined) {
    return app;
  }

  return {
    ...app,
    machines: {
      ...app.machines,
      createSelection: () => {
        const machine = app.machines.createSelection();

        machine.intents.select(symbol);

        return machine;
      },
    },
  };
}

/**
 * The application, with the row of one category already asked to delete it.
 * The request goes through the row machine's own intent and the real rules, so
 * the picture shows the refusal a click would have produced.
 */
function askToDeleteFromTheStart(
  app: Application,
  categoryId: string | undefined,
): Application {
  if (categoryId === undefined) {
    return app;
  }

  return {
    ...app,
    machines: {
      ...app.machines,
      createCategoryRow: (id: string) => {
        const machine = app.machines.createCategoryRow(id);

        if (id === categoryId) {
          machine.intents.remove();
        }

        return machine;
      },
    },
  };
}

/** The application, with the rename form of one category's row already open, through the row machine's own intent. */
function renameFromTheStart(
  app: Application,
  categoryId: string | undefined,
): Application {
  if (categoryId === undefined) {
    return app;
  }

  return {
    ...app,
    machines: {
      ...app.machines,
      createCategoryRow: (id: string) => {
        const machine = app.machines.createCategoryRow(id);

        if (id === categoryId) {
          machine.intents.edit();
        }

        return machine;
      },
    },
  };
}

/** The application, with the form that adds a user already filled in and sent. */
function sendUserFromTheStart(
  app: Application,
  draft: Scenario["userSent"],
): Application {
  if (draft === undefined) {
    return app;
  }

  return {
    ...app,
    machines: {
      ...app.machines,
      createUserForm: () => {
        const machine = app.machines.createUserForm();

        machine.intents.change(draft);
        machine.intents.save();

        return machine;
      },
    },
  };
}

/** The application, with the edit form of one user's row already open, through the row machine's own intent. */
function editUserFromTheStart(
  app: Application,
  userId: string | undefined,
): Application {
  if (userId === undefined) {
    return app;
  }

  return {
    ...app,
    machines: {
      ...app.machines,
      createUserRow: (id: string) => {
        const machine = app.machines.createUserRow(id);

        if (id === userId) {
          machine.intents.edit();
        }

        return machine;
      },
    },
  };
}

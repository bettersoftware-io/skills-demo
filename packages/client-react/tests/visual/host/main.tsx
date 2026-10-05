// The app's real global stylesheet, loaded the way src/main.tsx loads it. A
// copy of its rules here would drift, and the goldens would be of a page that
// does not exist.
import "../../../src/index.css";
import "./host.css";

import FakeTimers from "@sinonjs/fake-timers";
import { createRoot } from "react-dom/client";

import { type App as Application, STALE_AFTER_MS } from "@skills-demo/client-core";
import { type AppHarness, createAppHarness } from "@skills-demo/client-core/testing/appHarness.ts";
import { createViewModel, ViewModelProvider } from "@skills-demo/react-bindings";

import { App } from "../../../src/ui/App.tsx";
import { type Scenario, scenarios } from "../scenarios.ts";
import { ScenarioFrame } from "./ScenarioFrame.tsx";

// The visual host: the real UI on the real application, with only the outside
// world replaced. It shows the one scenario named in the address
// (`/?scenario=row-stale`) and then holds still:
//
// - Prices come from the app harness, by hand. There is no simulator, no
//   server and no network.
// - Time is a clock this page owns. It moves only when a scenario says a wait
//   has passed, so no timer ever fires on its own and a slow machine takes the
//   same picture as a fast one.

/** Any fixed moment. The UI shows no date today; if it ever does, the goldens will not change by the hour. */
const NOW = new Date("2026-01-01T12:00:00Z");

const name = new URLSearchParams(window.location.search).get("scenario");
const scenario: Scenario | undefined = (scenarios as Record<string, Scenario>)[name ?? ""];
const container = document.getElementById("root");

if (scenario === undefined) {
  throw new Error(
    `No scenario called "${name}". The address needs ?scenario=<name>, one of: ${Object.keys(scenarios).join(", ")}`,
  );
}

if (container === null) {
  throw new Error("the visual host's index.html has no #root element");
}

// Only the timer functions and the date are replaced. React's own scheduling
// is left alone, so rendering is not held up by the stopped clock.
const clock = FakeTimers.install({
  now: NOW,
  toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
});
// The directory answers at once and from memory, so it is on screen before the frame says it is ready.
const harness = createAppHarness({ directory: scenario.directory });

function seedPrices(): void {
  deliverAll(harness, scenario?.stalePrices ?? []);

  if (scenario?.stalePrices !== undefined) {
    clock.tick(STALE_AFTER_MS);
  }

  deliverAll(harness, scenario?.prices ?? []);
}

createRoot(container).render(
  <ViewModelProvider
    viewModel={createViewModel(
      sendUserFromTheStart(
        askToDeleteFromTheStart(
          selectFromTheStart(harness.app, scenario.selected),
          scenario.categoryAskedToDelete,
        ),
        scenario.userSent,
      ),
    )}
  >
    <ScenarioFrame seed={seedPrices}>
      <App />
    </ScenarioFrame>
  </ViewModelProvider>,
);

function deliverAll({ deliverPrice }: AppHarness, prices: Scenario["prices"]): void {
  for (const price of prices) {
    deliverPrice(price);
  }
}

/**
 * The application, with every selection machine it builds already holding the
 * scenario's selection. The selection is set through the machine's own intent,
 * so the picture shows what a click would have produced without a click.
 */
function selectFromTheStart(app: Application, symbol: string | undefined): Application {
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
function askToDeleteFromTheStart(app: Application, categoryId: string | undefined): Application {
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

/** The application, with the form that adds a user already filled in and sent. */
function sendUserFromTheStart(app: Application, draft: Scenario["userSent"]): Application {
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

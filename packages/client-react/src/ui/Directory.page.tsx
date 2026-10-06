import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  type AppHarnessOptions,
  createAppHarness,
} from "@skills-demo/client-core/testing/appHarness.ts";
import {
  createViewModel,
  ViewModelProvider,
} from "@skills-demo/react-bindings";

import { Directory } from "./Directory.tsx";
import { TESTIDS } from "./testids.ts";

/** What a test can do with, and ask of, the directory screen. */
export interface DirectoryPage {
  /** What the screen says in place of the lists, if it shows no lists. */
  status: () => string | null;
  /** Whether the category list and the user list are both on screen. */
  showsLists: () => boolean;
  /** The server comes back, and the person asks for the lists again. */
  tryAgainOnceReachable: () => Promise<void>;
}

/** Mounts the directory screen on the real application, with the directory linked as the test says. */
export function mountDirectory(
  directoryLink: AppHarnessOptions["directoryLink"],
): DirectoryPage {
  const harness = createAppHarness({ directoryLink });
  const user = userEvent.setup();

  const rendered = render(
    <ViewModelProvider viewModel={createViewModel(harness.app)}>
      <Directory />
    </ViewModelProvider>,
  );

  return {
    status: (): string | null => {
      return (
        rendered
          .queryByTestId(TESTIDS.directoryStatus)
          ?.firstChild?.textContent?.trim() ?? null
      );
    },
    showsLists: (): boolean => {
      return (
        rendered.queryByTestId(TESTIDS.categoryList) !== null &&
        rendered.queryByTestId(TESTIDS.userList) !== null
      );
    },
    tryAgainOnceReachable: async (): Promise<void> => {
      harness.connectDirectory();
      await user.click(rendered.getByRole("button", { name: "Try again" }));
    },
  };
}

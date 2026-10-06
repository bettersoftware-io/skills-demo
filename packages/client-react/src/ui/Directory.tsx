import type { ReactElement } from "react";

import { useViewModel } from "@skills-demo/react-bindings";

import { CategoryList } from "./CategoryList.tsx";
import { TESTIDS } from "./testids.ts";
import { UserList } from "./UserList.tsx";

/**
 * The users and their categories, or the reason they are not on screen. A dumb
 * component: whether the lists are loaded is the core's to say.
 */
export function Directory(): ReactElement {
  const { useDirectory } = useViewModel();
  const directory = useDirectory();

  if (directory.status === "loading") {
    return (
      <p data-testid={TESTIDS.directoryStatus}>Loading users and categories…</p>
    );
  }

  if (directory.status === "unavailable") {
    return (
      <p data-testid={TESTIDS.directoryStatus} role="alert">
        The users and categories could not be loaded.{" "}
        <button type="button" onClick={directory.reload}>
          Try again
        </button>
      </p>
    );
  }

  return (
    <div className="directory">
      <CategoryList />
      <UserList />
    </div>
  );
}

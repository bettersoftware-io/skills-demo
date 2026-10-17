import type { ReactElement } from "react";

import type { CategoryRow } from "@skills-demo/client-core";

import { TESTIDS } from "./testids.ts";

/**
 * The users in one category, in a dialog over the page: a layer fixed to the
 * window, with a scrim, and a card centred on it whose list scrolls once it
 * is longer than the card. A dumb component: who is in the category is the
 * core's to say, and a close is reported.
 */
export function MembersDialog({
  category,
  onClose,
}: MembersDialogProps): ReactElement {
  return (
    <div className="members-layer">
      <section
        className="members-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Members of ${category.name}`}
        data-testid={TESTIDS.membersDialog}
      >
        <h3>Members of {category.name}</h3>
        {category.members.length === 0 ? (
          <p className="members-none">No one is in this category yet.</p>
        ) : (
          <ul className="members-list">
            {category.members.map((member) => {
              return <li key={member.id}>{member.name}</li>;
            })}
          </ul>
        )}
        <button type="button" className="members-close" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

interface MembersDialogProps {
  category: CategoryRow;
  onClose: () => void;
}

import type { Refusal } from "@skills-demo/domain";
import type { ReactElement } from "react";

import { TESTIDS } from "./testids.ts";

/** Why a form's change was refused, shown next to that form. Nothing when it was not. */
export function RefusalMessage({ refusal }: RefusalMessageProps): ReactElement | null {
  if (refusal === null) {
    return null;
  }

  return (
    <p className="refusal" role="alert" data-testid={TESTIDS.refusal}>
      {refusal.message}
    </p>
  );
}

interface RefusalMessageProps {
  refusal: Refusal | null;
}

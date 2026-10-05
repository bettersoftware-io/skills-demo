import { describePricePortContract } from "@skills-demo/domain/ports/__contracts__/PricePortContract.ts";
import { encodePrice } from "@skills-demo/shared";
import { Subject } from "rxjs";

import { createWsPricePort } from "./wsPrice.ts";

describePricePortContract("WebSocket price adapter", () => {
  const messages$ = new Subject<unknown>();

  return {
    port: createWsPricePort({ messages: () => messages$ }),
    produce: (price): void => {
      messages$.next(encodePrice(price));
    },
    teardown: (): void => {
      messages$.complete();
    },
  };
});

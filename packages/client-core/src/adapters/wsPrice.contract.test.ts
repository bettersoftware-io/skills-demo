import { Subject } from "rxjs";

import type { Price } from "@skills-demo/domain";
import { describePricePortContract } from "@skills-demo/domain/ports/__contracts__/PricePortContract.ts";
import { encodePrice } from "@skills-demo/shared";

import { createWsPricePort } from "./wsPrice.ts";

describePricePortContract("WebSocket price adapter", () => {
  const messages$ = new Subject<unknown>();

  return {
    port: createWsPricePort({
      messages: () => {
        return messages$;
      },
    }),
    produce: (price: Price): void => {
      messages$.next(encodePrice(price));
    },
    teardown: (): void => {
      messages$.complete();
    },
  };
});

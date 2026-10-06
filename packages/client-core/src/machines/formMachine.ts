import { state } from "@rx-state/core";
import { type Observable, Subject, Subscription, scan } from "rxjs";

import { type Outcome, type Refusal, UNAVAILABLE } from "@skills-demo/domain";

import type { Machine } from "./machine.ts";

/** One form: what is typed into it, whether it is being sent, and why it was last refused. */
export interface FormState<TDraft> {
  /** Whether the fields are on screen. An add form's always are; a row's are while it is edited. */
  open: boolean;
  draft: TDraft;
  /** Why the last change this form asked for was refused. Shown next to the form. */
  refusal: Refusal | null;
  /** True from the moment a change is sent until it is answered. */
  busy: boolean;
}

export interface FormIntents<TDraft> {
  /** Replaces the fields named in the patch with what was typed. */
  change: (patch: Partial<TDraft>) => void;
  /** Sends the draft. Does nothing while an earlier change is unanswered. */
  save: () => void;
}

export interface RowFormIntents<TDraft> extends FormIntents<TDraft> {
  /** Opens the fields on the entry's values as they are now. */
  edit: () => void;
  /** Closes the fields and forgets what was typed. */
  cancel: () => void;
  /** Asks for the entry to be deleted. A refusal stays on the row. */
  remove: () => void;
}

export interface AddFormConfig<TDraft> {
  blank: TDraft;
  add: (draft: TDraft) => Observable<Outcome<unknown>>;
}

export interface RowFormConfig<TDraft> {
  /** The entry's values as they are now. */
  current: () => TDraft;
  save: (draft: TDraft) => Observable<Outcome<unknown>>;
  remove: () => Observable<Outcome<unknown>>;
}

export type FormAction<TDraft> =
  | { type: "opened"; draft: TDraft }
  | { type: "changed"; patch: Partial<TDraft> }
  | { type: "sent" }
  | { type: "refused"; refusal: Refusal }
  | { type: "settled"; rest: FormState<TDraft> };

export function reduceForm<TDraft>(
  current: FormState<TDraft>,
  action: FormAction<TDraft>,
): FormState<TDraft> {
  switch (action.type) {
    case "opened":
      return { open: true, draft: action.draft, refusal: null, busy: false };
    case "changed":
      // What was refused is no longer what is in the fields.
      return {
        ...current,
        draft: { ...current.draft, ...action.patch },
        refusal: null,
      };
    case "sent":
      return { ...current, refusal: null, busy: true };
    case "refused":
      return { ...current, refusal: action.refusal, busy: false };
    case "settled":
      return action.rest;
  }
}

/** The form that adds an entry: always open, and blank again once its entry is added. */
export function createAddFormMachine<TDraft>({
  blank,
  add,
}: AddFormConfig<TDraft>): Machine<FormState<TDraft>, FormIntents<TDraft>> {
  const form = createForm<TDraft>({
    open: true,
    draft: blank,
    refusal: null,
    busy: false,
  });

  return {
    state$: form.state$,
    intents: {
      change: form.change,
      save: (): void => {
        form.send(() => {
          return add(form.state$.getValue().draft);
        });
      },
    },
    dispose: form.dispose,
  };
}

/** The form of one entry in a list: closed until it is edited, and closed again once saved. */
export function createRowFormMachine<TDraft>({
  current,
  save,
  remove,
}: RowFormConfig<TDraft>): Machine<FormState<TDraft>, RowFormIntents<TDraft>> {
  const form = createForm<TDraft>({
    open: false,
    draft: current(),
    refusal: null,
    busy: false,
  });

  return {
    state$: form.state$,
    intents: {
      change: form.change,
      save: (): void => {
        form.send(() => {
          return save(form.state$.getValue().draft);
        });
      },
      edit: (): void => {
        form.dispatch({ type: "opened", draft: current() });
      },
      cancel: form.settle,
      remove: (): void => {
        form.send(remove);
      },
    },
    dispose: form.dispose,
  };
}

interface Form<TDraft> {
  state$: Machine<FormState<TDraft>, object>["state$"];
  dispatch: (action: FormAction<TDraft>) => void;
  change: (patch: Partial<TDraft>) => void;
  /** Puts the form back the way it rests. */
  settle: () => void;
  /** Sends a change, unless one is still unanswered, and settles or shows the refusal when it is answered. */
  send: (change: () => Observable<Outcome<unknown>>) => void;
  dispose: () => void;
}

/** Subjects in, one reducer, one state stream out; `rest` is the state the form starts in and returns to. */
function createForm<TDraft>(rest: FormState<TDraft>): Form<TDraft> {
  const action$ = new Subject<FormAction<TDraft>>();
  const state$ = state(action$.pipe(scan(reduceForm<TDraft>, rest)), rest);
  // Held open for the machine's whole life, so an intent sent before the UI
  // subscribes is not lost. Unanswered changes are dropped with it.
  const subscriptions = new Subscription();

  subscriptions.add(state$.subscribe());

  function dispatch(action: FormAction<TDraft>): void {
    action$.next(action);
  }

  function settle(): void {
    dispatch({ type: "settled", rest });
  }

  return {
    state$,
    dispatch,
    settle,
    change: (patch: Partial<TDraft>): void => {
      dispatch({ type: "changed", patch });
    },
    send: (change: () => Observable<Outcome<unknown>>): void => {
      if (state$.getValue().busy) {
        return;
      }

      dispatch({ type: "sent" });
      subscriptions.add(
        change().subscribe({
          next: (outcome: Outcome<unknown>) => {
            if (outcome.accepted) {
              settle();
            } else {
              dispatch({ type: "refused", refusal: outcome.refusal });
            }
          },
          // A port's change never fails; if one does all the same, the form is not left waiting for ever.
          error: () => {
            dispatch({ type: "refused", refusal: UNAVAILABLE });
          },
        }),
      );
    },
    dispose: (): void => {
      subscriptions.unsubscribe();
      action$.complete();
    },
  };
}

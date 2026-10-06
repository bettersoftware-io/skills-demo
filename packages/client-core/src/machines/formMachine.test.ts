import { type Observable, of, Subject, throwError } from "rxjs";
import { describe, expect, it } from "vitest";

import { accept, type Outcome, type Refusal, refuse } from "@skills-demo/domain";

import {
  createAddFormMachine,
  createRowFormMachine,
  type FormIntents,
  type FormState,
  type RowFormIntents,
  reduceForm,
} from "./formMachine.ts";
import type { Machine } from "./machine.ts";

describe("reduceForm", () => {
  it("opens on the draft it is given, with nothing left over from before", () => {
    expect(
      reduceForm({ ...CLOSED, refusal: TAKEN }, { type: "opened", draft: { name: "Design" } }),
    ).toEqual({
      open: true,
      draft: { name: "Design" },
      refusal: null,
      busy: false,
    });
  });

  it("replaces only the fields that were typed in, and drops the refusal they answer", () => {
    const current: FormState<Person> = { open: true, draft: ADA, refusal: TAKEN, busy: false };

    expect(reduceForm(current, { type: "changed", patch: { email: "ada@example.org" } })).toEqual({
      open: true,
      draft: { name: "Ada", email: "ada@example.org" },
      refusal: null,
      busy: false,
    });
  });

  it("is busy, with no refusal, while a change is unanswered", () => {
    expect(reduceForm({ ...OPEN, refusal: TAKEN }, { type: "sent" })).toEqual({
      ...OPEN,
      busy: true,
    });
  });

  it("shows why the change was refused, and keeps what was typed", () => {
    expect(reduceForm({ ...OPEN, busy: true }, { type: "refused", refusal: TAKEN })).toEqual({
      ...OPEN,
      refusal: TAKEN,
    });
  });

  it("goes back to the way it rests", () => {
    expect(reduceForm({ ...OPEN, busy: true }, { type: "settled", rest: CLOSED })).toEqual(CLOSED);
  });
});

describe("the form that adds an entry", () => {
  it("starts open and blank", () => {
    const { machine } = createAddForm();

    expect(machine.state$.getValue()).toEqual({
      open: true,
      draft: { name: "" },
      refusal: null,
      busy: false,
    });

    machine.dispose();
  });

  it("sends what was typed, and is blank again once the entry is added", () => {
    const { machine, sent } = createAddForm();

    machine.intents.change({ name: "Design" });
    machine.intents.save();

    expect(sent).toEqual([{ name: "Design" }]);
    expect(machine.state$.getValue()).toEqual({
      open: true,
      draft: { name: "" },
      refusal: null,
      busy: false,
    });

    machine.dispose();
  });

  it("keeps what was typed and shows the refusal when the entry is refused", () => {
    const { machine } = createAddForm(() => of(refuse(TAKEN)));

    machine.intents.change({ name: "Design" });
    machine.intents.save();

    expect(machine.state$.getValue()).toEqual({
      open: true,
      draft: { name: "Design" },
      refusal: TAKEN,
      busy: false,
    });

    machine.dispose();
  });

  it("drops the refusal as soon as the field is changed", () => {
    const { machine } = createAddForm(() => of(refuse(TAKEN)));

    machine.intents.save();
    machine.intents.change({ name: "Research" });

    expect(machine.state$.getValue().refusal).toBeNull();

    machine.dispose();
  });

  it("is busy until the change is answered, and sends nothing more meanwhile", () => {
    const answer$ = new Subject<Outcome<unknown>>();
    const { machine, sent } = createAddForm(() => answer$);

    machine.intents.change({ name: "Design" });
    machine.intents.save();
    machine.intents.save();

    expect(machine.state$.getValue().busy).toBe(true);
    expect(sent).toHaveLength(1);

    answer$.next(accept(null));

    expect(machine.state$.getValue().busy).toBe(false);

    machine.dispose();
  });

  it("can send again once it has been answered", () => {
    const { machine, sent } = createAddForm(() => of(refuse(TAKEN)));

    machine.intents.save();
    machine.intents.save();

    expect(sent).toHaveLength(2);

    machine.dispose();
  });

  it("is not left busy by a change that fails instead of answering", () => {
    const { machine } = createAddForm(() => throwError(() => new Error("the port broke its word")));

    machine.intents.save();

    expect(machine.state$.getValue()).toMatchObject({
      busy: false,
      refusal: { reason: "unavailable" },
    });

    machine.dispose();
  });

  it("stops listening for an answer, and ignores intents, once it is disposed", () => {
    const answer$ = new Subject<Outcome<unknown>>();
    const { machine } = createAddForm(() => answer$);
    const seen: boolean[] = [];

    machine.state$.subscribe((current) => seen.push(current.busy));
    machine.intents.save();
    machine.dispose();
    machine.intents.change({ name: "Design" });

    expect(answer$.observed).toBe(false);
    expect(seen).toEqual([false, true]);
  });
});

describe("the form of one entry in a list", () => {
  it("starts closed", () => {
    const { machine } = createRowForm();

    expect(machine.state$.getValue()).toMatchObject({ open: false, refusal: null, busy: false });

    machine.dispose();
  });

  it("opens on the entry's values as they are at that moment", () => {
    const row = createRowForm();

    row.entry.name = "Research";
    row.machine.intents.edit();

    expect(row.machine.state$.getValue()).toEqual({
      open: true,
      draft: { name: "Research" },
      refusal: null,
      busy: false,
    });

    row.machine.dispose();
  });

  it("saves what was typed, and closes once it is accepted", () => {
    const { machine, saved } = createRowForm();

    machine.intents.edit();
    machine.intents.change({ name: "Research" });
    machine.intents.save();

    expect(saved).toEqual([{ name: "Research" }]);
    expect(machine.state$.getValue().open).toBe(false);

    machine.dispose();
  });

  it("stays open with what was typed and the refusal when the save is refused", () => {
    const { machine } = createRowForm({ save: () => of(refuse(TAKEN)) });

    machine.intents.edit();
    machine.intents.change({ name: "Research" });
    machine.intents.save();

    expect(machine.state$.getValue()).toEqual({
      open: true,
      draft: { name: "Research" },
      refusal: TAKEN,
      busy: false,
    });

    machine.dispose();
  });

  it("closes and forgets what was typed and why it was refused when cancelled", () => {
    const { machine } = createRowForm({ save: () => of(refuse(TAKEN)) });

    machine.intents.edit();
    machine.intents.change({ name: "Research" });
    machine.intents.save();
    machine.intents.cancel();

    expect(machine.state$.getValue()).toEqual({
      open: false,
      draft: { name: "Design" },
      refusal: null,
      busy: false,
    });

    machine.dispose();
  });

  it("asks for the entry to be deleted", () => {
    const { machine, removals } = createRowForm();

    machine.intents.remove();

    expect(removals()).toBe(1);
    expect(machine.state$.getValue()).toMatchObject({ open: false, refusal: null, busy: false });

    machine.dispose();
  });

  it("shows on the closed row why the entry could not be deleted", () => {
    const { machine } = createRowForm({ remove: () => of(refuse(IN_USE)) });

    machine.intents.remove();

    expect(machine.state$.getValue()).toMatchObject({ open: false, refusal: IN_USE, busy: false });

    machine.dispose();
  });
});

interface Person {
  name: string;
  email: string;
}

const ADA: Person = { name: "Ada", email: "ada@example.com" };

const TAKEN: Refusal = { reason: "duplicate-name", field: "name", message: "That name is taken." };

const IN_USE: Refusal = { reason: "category-in-use", field: null, message: "It still has users." };

const CLOSED: FormState<{ name: string }> = {
  open: false,
  draft: { name: "" },
  refusal: null,
  busy: false,
};

const OPEN: FormState<{ name: string }> = {
  open: true,
  draft: { name: "Design" },
  refusal: null,
  busy: false,
};

type Answer = () => Observable<Outcome<unknown>>;

interface Draft {
  name: string;
}

interface AddForm {
  machine: Machine<FormState<Draft>, FormIntents<Draft>>;
  sent: Draft[];
}

function createAddForm(answer: Answer = () => of(accept(null))): AddForm {
  const sent: { name: string }[] = [];
  const machine = createAddFormMachine({
    blank: { name: "" },
    add: (draft: { name: string }) => {
      sent.push(draft);

      return answer();
    },
  });

  return { machine, sent };
}

interface RowForm {
  machine: Machine<FormState<Draft>, RowFormIntents<Draft>>;
  entry: Draft;
  saved: Draft[];
  removals: () => number;
}

/** The form of an entry called "Design"; `entry` is that entry, for a test to change behind the form's back. */
function createRowForm({
  save = (): Observable<Outcome<unknown>> => of(accept(null)),
  remove = (): Observable<Outcome<unknown>> => of(accept(null)),
}: {
  save?: Answer;
  remove?: Answer;
} = {}): RowForm {
  const entry = { name: "Design" };
  const saved: { name: string }[] = [];
  let removals = 0;
  const machine = createRowFormMachine({
    current: () => ({ ...entry }),
    save: (draft: { name: string }) => {
      saved.push(draft);

      return save();
    },
    remove: () => {
      removals += 1;

      return remove();
    },
  });

  return { machine, entry, saved, removals: (): number => removals };
}

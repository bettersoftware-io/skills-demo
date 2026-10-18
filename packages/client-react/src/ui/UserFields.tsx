import type { ChangeEvent, ReactElement } from "react";

import type { CategoryRow } from "@skills-demo/client-core";
import type { RefusalField, UserDraft } from "@skills-demo/domain";

import { Choice } from "./Choice.tsx";

/** The three fields of a user, for the form that adds one and the form that edits one. */
export function UserFields({
  draft,
  categories,
  invalid,
  onChange,
}: UserFieldsProps): ReactElement {
  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    onChange({ name: event.target.value });
  }

  function changeEmail(event: ChangeEvent<HTMLInputElement>): void {
    onChange({ email: event.target.value });
  }

  function changeCategory(categoryId: string): void {
    onChange({ categoryId });
  }

  return (
    <>
      <label>
        Name
        <input
          aria-invalid={invalid === "name"}
          value={draft.name}
          onChange={changeName}
        />
      </label>
      <label>
        Email
        <input
          aria-invalid={invalid === "email"}
          value={draft.email}
          onChange={changeEmail}
        />
      </label>
      <Choice
        label="Category"
        value={draft.categoryId}
        options={[
          { value: "", label: "Choose a category" },
          ...categories.map((category) => {
            return { value: category.id, label: category.name };
          }),
        ]}
        invalid={invalid === "category"}
        onChoose={changeCategory}
      />
    </>
  );
}

interface UserFieldsProps {
  draft: UserDraft;
  categories: CategoryRow[];
  /** The field the last refusal points at, if it points at one. */
  invalid: RefusalField | null;
  onChange: (patch: Partial<UserDraft>) => void;
}

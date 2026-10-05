import type { ChangeEvent, ReactElement } from "react";

import type { CategoryRow } from "@skills-demo/client-core";
import type { RefusalField, UserDraft } from "@skills-demo/domain";

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

  function changeCategory(event: ChangeEvent<HTMLSelectElement>): void {
    onChange({ categoryId: event.target.value });
  }

  return (
    <>
      <label>
        Name
        <input aria-invalid={invalid === "name"} value={draft.name} onChange={changeName} />
      </label>
      <label>
        Email
        <input aria-invalid={invalid === "email"} value={draft.email} onChange={changeEmail} />
      </label>
      <label>
        Category
        <select
          aria-invalid={invalid === "category"}
          value={draft.categoryId}
          onChange={changeCategory}
        >
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
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

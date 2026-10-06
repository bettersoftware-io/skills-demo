import type { ChangeEvent, FormEvent, ReactElement } from "react";

import type { CategoryRow } from "@skills-demo/client-core";
import { useViewModel } from "@skills-demo/react-bindings";

import { RefusalMessage } from "./RefusalMessage.tsx";
import { TESTIDS } from "./testids.ts";

/**
 * A dumb component: the categories the view model gives it, each with its own
 * rename and delete, and a form that adds one. Order, counts and every refusal
 * are already decided by the core.
 */
export function CategoryList(): ReactElement {
  const { useDirectory } = useViewModel();
  const { categories } = useDirectory();

  return (
    <section data-testid={TESTIDS.categoryList}>
      <h2>Categories</h2>
      <ul>
        {categories.map((category) => {
          return <CategoryItem key={category.id} category={category} />;
        })}
      </ul>
      <AddCategoryForm />
    </section>
  );
}

interface CategoryItemProps {
  category: CategoryRow;
}

function CategoryItem({ category }: CategoryItemProps): ReactElement {
  const { useCategoryRow } = useViewModel();
  const form = useCategoryRow(category.id);

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    form.change({ name: event.target.value });
  }

  function saveName(event: FormEvent): void {
    event.preventDefault();
    form.save();
  }

  return (
    <li data-testid={TESTIDS.categoryRow}>
      {form.state.open ? (
        <form aria-label={`Rename ${category.name}`} onSubmit={saveName}>
          <input
            aria-label="Name"
            aria-invalid={form.state.refusal?.field === "name"}
            value={form.state.draft.name}
            onChange={changeName}
          />
          <button type="submit" disabled={form.state.busy}>
            Save
          </button>
          <button type="button" onClick={form.cancel}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="entry">
          <strong>{category.name}</strong>
          <span className="count">
            {category.userCount === 1
              ? "1 user"
              : `${category.userCount} users`}
          </span>
          <button
            type="button"
            aria-label={`Rename ${category.name}`}
            onClick={form.edit}
          >
            Rename
          </button>
          <button
            type="button"
            aria-label={`Delete ${category.name}`}
            disabled={form.state.busy}
            onClick={form.remove}
          >
            Delete
          </button>
        </div>
      )}
      <RefusalMessage refusal={form.state.refusal} />
    </li>
  );
}

function AddCategoryForm(): ReactElement {
  const { useCategoryForm } = useViewModel();
  const form = useCategoryForm();

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    form.change({ name: event.target.value });
  }

  function addCategory(event: FormEvent): void {
    event.preventDefault();
    form.save();
  }

  return (
    <form
      data-testid={TESTIDS.categoryForm}
      aria-label="Add a category"
      onSubmit={addCategory}
    >
      <label>
        New category
        <input
          aria-invalid={form.state.refusal?.field === "name"}
          value={form.state.draft.name}
          onChange={changeName}
        />
      </label>
      <button type="submit" disabled={form.state.busy}>
        Add category
      </button>
      <RefusalMessage refusal={form.state.refusal} />
    </form>
  );
}

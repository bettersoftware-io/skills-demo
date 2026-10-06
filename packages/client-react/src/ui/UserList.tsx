import type { ChangeEvent, FormEvent, ReactElement } from "react";

import type { CategoryRow, UserRow } from "@skills-demo/client-core";
import { useViewModel } from "@skills-demo/react-bindings";

import { RefusalMessage } from "./RefusalMessage.tsx";
import { TESTIDS } from "./testids.ts";
import { UserFields } from "./UserFields.tsx";

/**
 * A dumb component: the users the view model gives it, each with its own edit
 * and delete, a choice of the category to narrow the list to, and a form that
 * adds a user. Which users are shown, and in what order, is decided by the core.
 */
export function UserList(): ReactElement {
  const directory = useViewModel().useDirectory();

  function showCategory(event: ChangeEvent<HTMLSelectElement>): void {
    directory.showCategory(event.target.value === "" ? null : event.target.value);
  }

  return (
    <section data-testid={TESTIDS.userList}>
      <h2>Users</h2>
      <label>
        Show
        <select value={directory.shownCategory ?? ""} onChange={showCategory}>
          <option value="">All categories</option>
          {directory.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Category</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {directory.users.map((user) => (
            <UserItem key={user.id} user={user} categories={directory.categories} />
          ))}
        </tbody>
      </table>
      <AddUserForm categories={directory.categories} />
    </section>
  );
}

interface UserItemProps {
  user: UserRow;
  categories: CategoryRow[];
}

function UserItem({ user, categories }: UserItemProps): ReactElement {
  const form = useViewModel().useUserRow(user.id);

  function saveUser(event: FormEvent): void {
    event.preventDefault();
    form.save();
  }

  if (form.state.open) {
    return (
      <tr data-testid={TESTIDS.userRow}>
        <td colSpan={4}>
          <form aria-label={`Edit ${user.name}`} onSubmit={saveUser}>
            <UserFields
              draft={form.state.draft}
              categories={categories}
              invalid={form.state.refusal?.field ?? null}
              onChange={form.change}
            />
            <button type="submit" disabled={form.state.busy}>
              Save
            </button>
            <button type="button" onClick={form.cancel}>
              Cancel
            </button>
            <RefusalMessage refusal={form.state.refusal} />
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr data-testid={TESTIDS.userRow}>
      <th scope="row">{user.name}</th>
      <td>{user.email}</td>
      <td>{user.categoryName}</td>
      <td>
        <button type="button" aria-label={`Edit ${user.name}`} onClick={form.edit}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${user.name}`}
          disabled={form.state.busy}
          onClick={form.remove}
        >
          Delete
        </button>
        <RefusalMessage refusal={form.state.refusal} />
      </td>
    </tr>
  );
}

interface AddUserFormProps {
  categories: CategoryRow[];
}

function AddUserForm({ categories }: AddUserFormProps): ReactElement {
  const form = useViewModel().useUserForm();

  function addUser(event: FormEvent): void {
    event.preventDefault();
    form.save();
  }

  return (
    <form data-testid={TESTIDS.userForm} aria-label="Add a user" onSubmit={addUser}>
      <UserFields
        draft={form.state.draft}
        categories={categories}
        invalid={form.state.refusal?.field ?? null}
        onChange={form.change}
      />
      <button type="submit" disabled={form.state.busy}>
        Add user
      </button>
      <RefusalMessage refusal={form.state.refusal} />
    </form>
  );
}

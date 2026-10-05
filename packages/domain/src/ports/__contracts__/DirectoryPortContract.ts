import { firstValueFrom } from "rxjs";
import { describe, expect, it } from "vitest";

import type { DirectorySnapshot } from "../../entities/directory.ts";
import type { DirectoryPort } from "../directoryPort.ts";

/** What an adapter's test supplies so the contract can drive it. */
export interface DirectoryPortHarness {
  port: DirectoryPort;
  teardown: () => void;
}

/** Two categories, one of them empty, and two users who share the other. */
const SEED: DirectorySnapshot = {
  categories: [
    { id: "eng", name: "Engineering" },
    { id: "ops", name: "Operations" },
  ],
  users: [
    { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true },
    { id: "grace", name: "Grace", email: "grace@example.com", categoryId: "eng", active: true },
  ],
};

/**
 * The behaviour every DirectoryPort adapter owes its callers. Each adapter's
 * test calls this with a harness that builds the adapter on the directory it
 * is given; an adapter that passes is interchangeable with the others.
 */
export function describeDirectoryPortContract(
  label: string,
  createHarness: (seed: DirectorySnapshot) => DirectoryPortHarness,
): void {
  describe(`${label} :: DirectoryPort contract`, () => {
    it("lists the categories and the users it holds", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.categories())).toEqual(SEED.categories);
        expect(await firstValueFrom(port.users())).toEqual(SEED.users);
      } finally {
        teardown();
      }
    });

    it("does nothing until someone subscribes", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        port.addCategory({ name: "Design" });
        port.removeUser("ada");

        expect(await firstValueFrom(port.categories())).toHaveLength(2);
        expect(await firstValueFrom(port.users())).toHaveLength(2);
      } finally {
        teardown();
      }
    });

    it("adds a category, trimmed, under an id of its own", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        const outcome = await firstValueFrom(port.addCategory({ name: "  Design " }));
        const categories = await firstValueFrom(port.categories());

        expect(outcome).toEqual({ accepted: true, value: { id: expect.any(String), name: "Design" } });
        expect(categories).toHaveLength(3);
        expect(categories).toContainEqual(outcome.accepted && outcome.value);
        expect(new Set(categories.map((category) => category.id)).size).toBe(3);
      } finally {
        teardown();
      }
    });

    it("refuses a category with no name", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.addCategory({ name: "   " }))).toEqual({
          accepted: false,
          refusal: { reason: "empty-name", field: "name", message: "A category needs a name." },
        });
        expect(await firstValueFrom(port.categories())).toEqual(SEED.categories);
      } finally {
        teardown();
      }
    });

    it("refuses a second category of the same name, whatever its case", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.addCategory({ name: "ENGINEERING" }))).toEqual({
          accepted: false,
          refusal: {
            reason: "duplicate-name",
            field: "name",
            message: 'There is already a category called "ENGINEERING".',
          },
        });
        expect(await firstValueFrom(port.renameCategory("ops", { name: "engineering" }))).toMatchObject({
          accepted: false,
          refusal: { reason: "duplicate-name", field: "name" },
        });
        expect(await firstValueFrom(port.categories())).toEqual(SEED.categories);
      } finally {
        teardown();
      }
    });

    it("renames a category, and lets one keep its own name in another case", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.renameCategory("ops", { name: "Support" }))).toEqual({
          accepted: true,
          value: { id: "ops", name: "Support" },
        });
        expect(await firstValueFrom(port.renameCategory("eng", { name: "ENGINEERING" }))).toEqual({
          accepted: true,
          value: { id: "eng", name: "ENGINEERING" },
        });
        expect(await firstValueFrom(port.categories())).toEqual([
          { id: "eng", name: "ENGINEERING" },
          { id: "ops", name: "Support" },
        ]);
      } finally {
        teardown();
      }
    });

    it("refuses to delete a category that still has users, and says why", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.removeCategory("eng"))).toEqual({
          accepted: false,
          refusal: {
            reason: "category-in-use",
            field: null,
            message: '"Engineering" still has 2 users. Move or delete them first.',
          },
        });
        expect(await firstValueFrom(port.categories())).toEqual(SEED.categories);
      } finally {
        teardown();
      }
    });

    it("deletes a category that has no users", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.removeCategory("ops"))).toEqual({ accepted: true, value: null });
        expect(await firstValueFrom(port.categories())).toEqual([{ id: "eng", name: "Engineering" }]);
      } finally {
        teardown();
      }
    });

    it("adds a user, trimmed, under an id of their own", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        const outcome = await firstValueFrom(
          port.addUser({ name: " Linus ", email: " linus@example.com ", categoryId: "ops" }),
        );
        const users = await firstValueFrom(port.users());

        expect(outcome).toEqual({
          accepted: true,
          value: { id: expect.any(String), name: "Linus", email: "linus@example.com", categoryId: "ops", active: true },
        });
        expect(users).toHaveLength(3);
        expect(users).toContainEqual(outcome.accepted && outcome.value);
        expect(new Set(users.map((user) => user.id)).size).toBe(3);
      } finally {
        teardown();
      }
    });

    it("refuses a user with no name, a bad email address or no such category", async () => {
      const { port, teardown } = createHarness(SEED);
      const linus = { name: "Linus", email: "linus@example.com", categoryId: "ops" };

      try {
        expect(await firstValueFrom(port.addUser({ ...linus, name: " " }))).toEqual({
          accepted: false,
          refusal: { reason: "empty-name", field: "name", message: "A user needs a name." },
        });
        expect(await firstValueFrom(port.addUser({ ...linus, email: "linus.example.com" }))).toEqual({
          accepted: false,
          refusal: { reason: "invalid-email", field: "email", message: "This does not look like an email address." },
        });
        expect(await firstValueFrom(port.addUser({ ...linus, categoryId: "sales" }))).toEqual({
          accepted: false,
          refusal: { reason: "unknown-category", field: "category", message: "This category no longer exists." },
        });
        expect(await firstValueFrom(port.users())).toEqual(SEED.users);
      } finally {
        teardown();
      }
    });

    it("refuses a second user with the same email address, whatever its case", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(
          await firstValueFrom(port.addUser({ name: "Other Ada", email: "ADA@example.com", categoryId: "ops" })),
        ).toEqual({
          accepted: false,
          refusal: {
            reason: "duplicate-email",
            field: "email",
            message: "Another user already has the email address ADA@example.com.",
          },
        });
        expect(
          await firstValueFrom(port.changeUser("grace", { name: "Grace", email: "Ada@Example.com", categoryId: "eng" })),
        ).toMatchObject({ accepted: false, refusal: { reason: "duplicate-email", field: "email" } });
        expect(await firstValueFrom(port.users())).toEqual(SEED.users);
      } finally {
        teardown();
      }
    });

    it("changes a user, and lets one keep their own email address", async () => {
      const { port, teardown } = createHarness(SEED);
      const moved = { name: "Ada Lovelace", email: "ADA@example.com", categoryId: "ops" };

      try {
        expect(await firstValueFrom(port.changeUser("ada", moved))).toEqual({
          accepted: true,
          value: { id: "ada", ...moved, active: true },
        });
        expect(await firstValueFrom(port.users())).toEqual([{ id: "ada", ...moved, active: true }, SEED.users[1]]);
      } finally {
        teardown();
      }
    });

    it("deletes a user, which frees their category to be deleted", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.removeUser("ada"))).toEqual({ accepted: true, value: null });
        expect(await firstValueFrom(port.removeUser("grace"))).toEqual({ accepted: true, value: null });
        expect(await firstValueFrom(port.users())).toEqual([]);
        expect(await firstValueFrom(port.removeCategory("eng"))).toEqual({ accepted: true, value: null });
      } finally {
        teardown();
      }
    });

    it("refuses a change to something that is not there", async () => {
      const { port, teardown } = createHarness(SEED);
      const gone = { accepted: false, refusal: { reason: "not-found", field: null } };

      try {
        expect(await firstValueFrom(port.renameCategory("sales", { name: "Sales" }))).toMatchObject(gone);
        expect(await firstValueFrom(port.removeCategory("sales"))).toMatchObject(gone);
        expect(
          await firstValueFrom(port.changeUser("linus", { name: "Linus", email: "l@example.com", categoryId: "ops" })),
        ).toMatchObject(gone);
        expect(await firstValueFrom(port.removeUser("linus"))).toMatchObject(gone);
      } finally {
        teardown();
      }
    });

    it("toggles a user active and inactive", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        let deactivated = await firstValueFrom(port.toggleUserActive("ada"));
        expect(deactivated).toEqual({
          accepted: true,
          value: { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: false },
        });

        let reactivated = await firstValueFrom(port.toggleUserActive("ada"));
        expect(reactivated).toEqual({
          accepted: true,
          value: { id: "ada", name: "Ada", email: "ada@example.com", categoryId: "eng", active: true },
        });

        expect(await firstValueFrom(port.users())).toEqual(SEED.users);
      } finally {
        teardown();
      }
    });

    it("refuses to toggle a user that does not exist", async () => {
      const { port, teardown } = createHarness(SEED);

      try {
        expect(await firstValueFrom(port.toggleUserActive("linus"))).toMatchObject({
          accepted: false,
          refusal: { reason: "not-found", field: null },
        });
      } finally {
        teardown();
      }
    });
  });
}

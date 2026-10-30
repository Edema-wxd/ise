"use client";

import { useActionState } from "react";
import styles from "../studio.module.css";
import { createCollection } from "./actions";
import type { NewCollectionState } from "./state";

const INITIAL: NewCollectionState = { error: "" };

/** Starts a collection with just a name. It is created unpublished and opens
 *  in the editor, where the rest gets filled in. */
export function NewCollectionForm() {
  const [state, action, pending] = useActionState(createCollection, INITIAL);

  return (
    <form action={action} className={styles.newForm}>
      <label htmlFor="new-collection" className={styles.label}>
        New collection
      </label>
      <div className={styles.inline}>
        <input
          id="new-collection"
          name="name"
          className={styles.input}
          placeholder="e.g. Beaded work"
          maxLength={120}
          aria-describedby={state.error ? "new-collection-error" : undefined}
          aria-invalid={state.error ? true : undefined}
        />
        <button type="submit" className="cta" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      {state.error ? (
        <p id="new-collection-error" className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

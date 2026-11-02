"use client";

import { useActionState } from "react";
import type { Kind } from "@/lib/studio/kinds";
import { createEntry } from "./actions";
import type { NewEntryState } from "./state";
import styles from "./studio.module.css";

const INITIAL: NewEntryState = { error: "" };

/** Starts an entry with just a name. It is created unpublished and opens in
 *  the editor, where the rest gets filled in. */
export function NewEntryForm({ kind, one, placeholder }: { kind: Kind; one: string; placeholder: string }) {
  const [state, action, pending] = useActionState(createEntry, INITIAL);
  const id = `new-${kind}`;

  return (
    <form action={action} className={styles.newForm}>
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor={id} className={styles.label}>
        New {one}
      </label>
      <div className={styles.inline}>
        <input
          id={id}
          name="name"
          className={styles.input}
          placeholder={placeholder}
          maxLength={120}
          aria-describedby={state.error ? `${id}-error` : undefined}
          aria-invalid={state.error ? true : undefined}
        />
        <button type="submit" className="cta" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      {state.error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

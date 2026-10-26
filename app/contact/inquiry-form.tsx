"use client";

import { useActionState } from "react";
import { sendInquiry } from "./actions";
import { EMPTY_INQUIRY } from "./inquiry";
import styles from "./contact.module.css";

export function InquiryForm() {
  const [state, action, pending] = useActionState(sendInquiry, EMPTY_INQUIRY);
  const { errors, values } = state;

  return (
    <div className={styles.formWrap}>
      {/* The form is keyed on the submission count: React resets an
          uncontrolled form on submit, so the fields remount and re-seed from
          what came back, and a rejected inquiry keeps its text. The status
          below stays outside it — a live region that remounts with its
          message already in it does not get announced. */}
      <form key={state.key} action={action} className={styles.form} noValidate>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>What is this about?</legend>
          <div className={styles.choices}>
            <label className={styles.choice}>
              <input
                type="radio"
                name="kind"
                value="commission"
                defaultChecked={values.kind !== "general"}
              />
              <span>A piece made for me</span>
            </label>
            <label className={styles.choice}>
              <input
                type="radio"
                name="kind"
                value="general"
                defaultChecked={values.kind === "general"}
              />
              <span>Something else</span>
            </label>
          </div>
          {errors.kind ? <p className={styles.error}>{errors.kind}</p> : null}
        </fieldset>

        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={values.name}
            className={styles.input}
            aria-describedby={errors.name ? "name-error" : undefined}
            aria-invalid={errors.name ? true : undefined}
          />
          {errors.name ? (
            <p id="name-error" className={styles.error}>
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
            className={styles.input}
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={errors.email ? true : undefined}
          />
          {errors.email ? (
            <p id="email-error" className={styles.error}>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="message" className={styles.label}>
            What do you have in mind?
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            defaultValue={values.message}
            className={styles.input}
            aria-describedby={errors.message ? "message-error" : "message-hint"}
            aria-invalid={errors.message ? true : undefined}
          />
          {errors.message ? (
            <p id="message-error" className={styles.error}>
              {errors.message}
            </p>
          ) : (
            <p id="message-hint" className={styles.hint}>
              Material, size, and when you need it, if you know them yet.
            </p>
          )}
        </div>

          <button type="submit" className="cta" disabled={pending}>
            {pending ? "Sending" : "Send to the studio"}
          </button>
      </form>

      <p
        aria-live="polite"
        className={[
          styles.status,
          state.status === "undelivered" ? styles.statusFailed : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {state.message || null}
      </p>
    </div>
  );
}

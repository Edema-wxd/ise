"use server";

import { getSql } from "@/lib/db";
import { SITE } from "@/lib/content";
import type { InquiryState, InquiryValues } from "./inquiry";

const KINDS = new Set(["commission", "general"]);

/** Matches the length checks on the inquiries table, so the database never
 *  rejects something the form said was fine. */
const LIMITS = { name: 120, email: 200, message: 4000 } as const;

function text(form: FormData, field: string) {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validates an inquiry and writes it to Neon.
 *
 * Server Actions accept direct POSTs, not just submissions from this form, so
 * everything here is validated and length-capped server side regardless of
 * what the client sent.
 *
 * TODO(before launch): there is no rate limiting, so the form is open to
 * automated spam. Add a limiter — Neon can hold the counters — or put the
 * route behind the host's bot protection.
 *
 * TODO(client): nothing notifies the studio of a new row yet. Decide whether
 * that is an email on insert or someone reading the table.
 */
export async function sendInquiry(
  previous: InquiryState,
  form: FormData,
): Promise<InquiryState> {
  const values: InquiryValues = {
    kind: text(form, "kind"),
    name: text(form, "name"),
    email: text(form, "email"),
    message: text(form, "message"),
  };

  const key = previous.key + 1;
  const errors: Record<string, string> = {};

  if (!values.name) errors.name = "Add a name so the studio knows who is writing.";
  else if (values.name.length > LIMITS.name) {
    errors.name = `That is longer than ${LIMITS.name} characters.`;
  }

  if (!values.email) errors.email = "Add an email address for the reply.";
  else if (values.email.length > LIMITS.email) {
    errors.email = `That is longer than ${LIMITS.email} characters.`;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "That email address is missing something.";
  }

  if (!values.message) errors.message = "Say what you are after, even roughly.";
  else if (values.message.length > LIMITS.message) {
    errors.message = `That is longer than ${LIMITS.message} characters. Send the short version and the studio will ask for the rest.`;
  }

  if (!KINDS.has(values.kind)) errors.kind = "Pick what this is about.";

  if (Object.keys(errors).length > 0) {
    return { status: "invalid", key, values, errors, message: "" };
  }

  const undelivered = {
    status: "undelivered" as const,
    key,
    values,
    errors: {},
    message: `That did not save. Email ${SITE.email} and the studio will pick it up.`,
  };

  const sql = getSql();
  if (!sql) {
    console.error("sendInquiry: DATABASE_URL is not set, inquiry not saved");
    return undelivered;
  }

  try {
    // Interpolated values are sent as bound parameters, not spliced into SQL.
    await sql`
      insert into inquiries (kind, name, email, message)
      values (${values.kind}, ${values.name}, ${values.email}, ${values.message})
    `;
  } catch (error) {
    // The message can carry connection details, so it stays in the server log
    // and the visitor gets the address instead.
    console.error("sendInquiry: insert failed", error);
    return undelivered;
  }

  return {
    status: "sent",
    key,
    // Cleared: a saved inquiry should leave an empty form behind it.
    values: { kind: values.kind, name: "", email: "", message: "" },
    errors: {},
    message: "That reached the studio. You will get a reply at the address you gave.",
  };
}

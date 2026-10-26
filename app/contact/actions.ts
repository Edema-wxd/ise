"use server";

import { getSql } from "@/lib/db";
import { getSite } from "@/lib/content";
import { allowInquiry } from "@/lib/rate-limit";
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
 * Submissions are capped per caller and site-wide — see `lib/rate-limit.ts`.
 * That is a speed bump, not bot protection: put the route behind the host's
 * own bot rules as well if the form starts attracting real traffic.
 *
 * A saved inquiry is handed to the studio by the hourly digest in
 * `functions/inquiries.ts`, which reads the rows this writes.
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

  const site = await getSite();

  const undelivered = {
    status: "undelivered" as const,
    key,
    values,
    errors: {},
    message: `That did not save. Email ${site.email} and the studio will pick it up.`,
  };

  const sql = getSql();
  if (!sql) {
    console.error("sendInquiry: DATABASE_URL is not set, inquiry not saved");
    return undelivered;
  }

  /* Checked here rather than before validation: a submission the form already
     rejected has cost nothing and should not use up anyone's allowance. */
  try {
    if (!(await allowInquiry(sql))) {
      return {
        ...undelivered,
        message: `That is more than the form takes in an hour. Email ${site.email} and the studio will pick it up.`,
      };
    }
  } catch (error) {
    // A limiter that cannot read its own table must not block a real
    // commission. Log it and let the submission through.
    console.error("sendInquiry: rate-limit check failed, allowing", error);
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

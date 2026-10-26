import { defineConfig } from "@neon/config/v1";

/**
 * Neon infrastructure for this site, in version control.
 *
 * Apply with `neon deploy --env .env.local` (the `--env` file is where the
 * Function env below is read from; `neon env pull` writes only the variables
 * Neon manages, so our own keys have to be in that file already).
 * `neon config plan` shows the diff first.
 */
export default defineConfig({
  // Managed Better Auth, in the branch's own `neon_auth` schema. It guards
  // /studio; the public portfolio has no accounts.
  auth: true,

  functions: {
    // Slug is permanent and appears in the URL — it cannot be renamed later.
    inquiries: {
      name: "Studio inquiries feed",
      source: "./functions/inquiries.ts",
      env: {
        /** Accounts allowed to read the inbox, comma separated. */
        STUDIO_EMAILS: process.env.STUDIO_EMAILS!,
        /** Browser origins allowed to call it, comma separated. */
        STUDIO_ORIGINS: process.env.STUDIO_ORIGINS!,
        /* Where the hourly digest posts new inquiries. Spread in only when
           set: writing an unset key as "" would delete the live value, and
           the digest is written to report a missing destination rather than
           silently mark rows delivered. */
        ...(process.env.STUDIO_WEBHOOK_URL
          ? { STUDIO_WEBHOOK_URL: process.env.STUDIO_WEBHOOK_URL }
          : {}),
      },
    },
  },

  triggers: {
    // Neon POSTs this on the hour; the handler is a no-op when nothing new
    // has come in, so an idle site costs an empty query.
    "inquiries-digest": {
      type: "schedule",
      function: "inquiries",
      cron: "0 * * * *",
      functionPath: "/digest",
    },
  },

  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});

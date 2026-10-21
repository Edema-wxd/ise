"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import styles from "./studio.module.css";

type Inquiry = {
  id: string;
  kind: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

type Feed = { branch: string; count: number; inquiries: Inquiry[] };

const when = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Reads the inbox straight from the Neon Function, not through this app.
 *
 * The browser mints a short-lived Managed Auth JWT and calls the function's
 * public URL with it. Keeping the app server out of the path is the pattern
 * Neon documents for functions: the host's request limits never apply, and the
 * function is the single place authorization is decided.
 */
export function Inbox({ endpoint }: { endpoint: string }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  const load = useCallback(async () => {
    setPending(true);
    setError("");
    try {
      const { data, error } = await authClient.token();
      if (error || !data?.token) {
        setError("That session cannot mint a token. Sign in again.");
        return;
      }

      const response = await fetch(endpoint, {
        headers: { authorization: `Bearer ${data.token}` },
      });
      if (!response.ok) {
        // 403 is the allowlist, 401 is an expired or missing token.
        setError(
          response.status === 403
            ? "That account is signed in but is not on the studio list."
            : `The inquiries function answered ${response.status}.`,
        );
        return;
      }
      setFeed((await response.json()) as Feed);
    } catch {
      setError("Could not reach the inquiries function.");
    } finally {
      setPending(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.inbox}>
      <div className={styles.toolbar}>
        <button className="ctaQuiet" disabled={pending} onClick={() => void load()}>
          {pending ? "Loading…" : "Refresh"}
        </button>
        {feed ? (
          <p className={styles.meta}>
            {feed.count} on branch {feed.branch}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {feed && feed.inquiries.length === 0 && !error ? (
        <p className={styles.meta}>Nothing yet. The form has not been used.</p>
      ) : null}

      <ul className={styles.list}>
        {feed?.inquiries.map((inquiry) => (
          <li className={styles.item} key={inquiry.id}>
            <p className={styles.itemHead}>
              <span className={styles.kind}>{inquiry.kind}</span>
              <time dateTime={inquiry.created_at}>
                {when.format(new Date(inquiry.created_at))}
              </time>
            </p>
            <p className={styles.from}>
              {inquiry.name} &mdash;{" "}
              <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
            </p>
            <p className={styles.message}>{inquiry.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

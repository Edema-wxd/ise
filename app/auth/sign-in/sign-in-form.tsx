"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import styles from "./sign-in.module.css";

/**
 * Email and password against Managed Better Auth.
 *
 * There is no sign-up here on purpose. Studio accounts are made in the Neon
 * console, and the inbox checks the account against an allowlist anyway, so a
 * public form would only invite attempts.
 */
export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");

    // Better Auth resolves with { data, error } rather than throwing, but the
    // network underneath it still can.
    try {
      const { error } = await authClient.signIn.email({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (error) {
        setError(error.message ?? "That did not sign you in.");
        return;
      }
      router.push("/studio");
      router.refresh();
    } catch {
      setError("The sign-in service did not answer. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          autoComplete="username"
          className={styles.input}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className={styles.input}
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <button className="cta" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

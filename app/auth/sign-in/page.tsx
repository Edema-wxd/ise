import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
import { getAuth } from "@/lib/auth/server";
import { SignInForm } from "./sign-in-form";
import styles from "./sign-in.module.css";

export const metadata: Metadata = {
  title: "Studio sign-in",
  // Nothing here belongs in a search result.
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main>
      <PageIntro title="Studio sign-in">
        For the studio, not for visitors. Commissions start on the{" "}
        <a href="/contact">custom orders</a> page.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          {/* Settled at build time, like the rest of this static page: the
              Neon Auth variables are build-time env on the host too. */}
          {getAuth() ? (
            <SignInForm />
          ) : (
            <p className={styles.error}>
              Studio sign-in is not set up on this deployment. Set
              NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET, then redeploy.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

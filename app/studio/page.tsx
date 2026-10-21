import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/page-intro";
import { auth } from "@/lib/auth/server";
import { Inbox } from "./inbox";
import { SignOutButton } from "./sign-out";
import styles from "./studio.module.css";

export const metadata: Metadata = {
  title: "Studio inbox",
  robots: { index: false, follow: false },
};

// Reading the session is per request, so this page cannot be prerendered.
export const dynamic = "force-dynamic";

/**
 * The studio's view of what came through the custom-orders form.
 *
 * proxy.ts already redirects an unauthenticated visitor here, but that is an
 * optimistic check against a cookie. The session is read again below, because
 * this is the request that decides whether the page renders at all.
 */
export default async function StudioPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");

  const endpoint = process.env.NEON_FUNCTION_INQUIRIES_BASE_URL;

  return (
    <main>
      <PageIntro title="Studio inbox">
        Signed in as {session.user.email}. Every inquiry the site has taken,
        newest first.
      </PageIntro>

      <section className="band bandPaper">
        <div className={`wrap ${styles.layout}`}>
          {endpoint ? (
            <Inbox endpoint={endpoint} />
          ) : (
            /* The variable is written by `neon deploy` / `neon env pull`. Its
               absence is a deployment that never happened, not a user error. */
            <p className={styles.error}>
              NEON_FUNCTION_INQUIRIES_BASE_URL is not set. Run{" "}
              <code>neon deploy --env .env.local</code>.
            </p>
          )}
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}

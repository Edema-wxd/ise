import type { Metadata } from "next";
import { PageIntro } from "@/components/page-intro";
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
          <SignInForm />
        </div>
      </section>
    </main>
  );
}

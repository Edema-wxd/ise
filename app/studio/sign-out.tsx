"use client";

import { useRouter } from "next/navigation";
import { endPreview } from "@/app/preview-actions";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="ctaQuiet"
      onClick={async () => {
        // Drafts stay visible in this browser while preview is on, so it
        // ends with the session.
        await endPreview();
        await authClient.signOut();
        router.push("/auth/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

"use client";

import { useId, useRef, useState } from "react";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import styles from "./studio.module.css";

/*
  The studio's photo upload button. It opens the device's own picker (the
  camera roll or camera on a phone, the file browser on a desktop), sends the
  photos to UploadThing through /api/uploadthing, and hands back their links
  for the editor to put in the draft.

  Uploading changes nothing public. The link only reaches the site when the
  draft it went into is published.

  The vanilla uploadthing client, not @uploadthing/react: one call, no new
  dependency, and the button stays in the studio's own styles.
*/

/** The same ceiling as the route in app/api/uploadthing/core.ts. */
const MAX_BYTES = 16 * 1024 * 1024;

export function PhotoUpload({
  label,
  multiple = false,
  onUploaded,
}: {
  /** The button's text, e.g. "Upload photo". */
  label: string;
  multiple?: boolean;
  /** Called once per upload with every link, in the order picked. */
  onUploaded: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const statusId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const busy = progress !== null;

  async function upload(files: File[]) {
    if (files.length === 0) return;

    const tooBig = files.find((file) => file.size > MAX_BYTES);
    if (tooBig) {
      setMessage({ error: true, text: `${tooBig.name} is over 16 MB. Pick a smaller copy.` });
      return;
    }

    setMessage(null);
    setProgress(0);
    try {
      // Built here, not at import, so the endpoint is always this page's own origin.
      const { uploadFiles } = genUploader<OurFileRouter>({
        url: new URL("/api/uploadthing", window.location.origin),
        package: "ise-studio",
      });
      // Worked out from bytes: uploadthing's own totalProgress is 0-1 on one
      // code path and 0-100 on the other.
      const totalSize = files.reduce((sum, file) => sum + file.size, 0) || 1;
      const uploaded = await uploadFiles("studioMedia", {
        files,
        onUploadProgress: ({ totalLoaded }) => setProgress(Math.min(100, (totalLoaded / totalSize) * 100)),
      });
      onUploaded(uploaded.map((file) => file.ufsUrl));
      setMessage({
        error: false,
        text:
          uploaded.length === 1
            ? "Uploaded. Save the draft to keep it."
            : `${uploaded.length} photos uploaded. Save the draft to keep them.`,
      });
    } catch (error) {
      console.error("studio: upload failed", error);
      const reason = error instanceof Error && error.message ? error.message : "";
      setMessage({ error: true, text: `Upload failed. ${reason || "Try again."}` });
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className={styles.upload}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Cleared so picking the same photo again still fires a change.
          event.target.value = "";
          void upload(files);
        }}
      />
      <button
        type="button"
        className={styles.uploadButton}
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-describedby={statusId}
      >
        {busy ? `Uploading… ${Math.round(progress ?? 0)}%` : label}
      </button>
      <p id={statusId} aria-live="polite" className={message?.error ? styles.error : styles.meta}>
        {message?.text ?? ""}
      </p>
    </div>
  );
}

/** A small look at the photo a link points to, so it can be checked on the spot. */
export function PhotoPreview({ src }: { src: string }) {
  if (!/^https:\/\/\S+$/.test(src)) return null;
  return (
    // A studio-only thumbnail of a link that may not be on an allowed
    // next/image host, so a plain img. The public pages use next/image.
    <img src={src} alt="" className={styles.preview} loading="lazy" decoding="async" />
  );
}

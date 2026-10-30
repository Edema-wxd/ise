"use client";

/**
 * A submit button that asks first. For actions that change the live site or
 * throw away work: delete, unpublish, discard edits. Without JavaScript the
 * browser cannot ask, so the button submits directly; every one of these
 * actions is recorded and reversible.
 */
export function ConfirmButton({
  children,
  confirm,
  className,
  label,
}: {
  children: React.ReactNode;
  confirm: string;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      aria-label={label}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

import styles from "./page-intro.module.css";

/**
 * The top of every route below the home page: title, one paragraph, and the
 * brick rule that carries through from the header.
 */
export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.intro}>
      <div className="wrap">
        <h1>{title}</h1>
        {children ? <div className={`lead ${styles.body}`}>{children}</div> : null}
      </div>
    </div>
  );
}

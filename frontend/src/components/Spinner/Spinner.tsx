import styles from './Spinner.module.css';

export function Spinner(): JSX.Element {
  return (
    <div className={styles.wrapper} role="status" aria-label="Загрузка">
      <div className={styles.circle} />
    </div>
  );
}

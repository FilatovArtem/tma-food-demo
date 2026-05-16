import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: Props): JSX.Element {
  return (
    <div className={styles.wrap}>
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.desc}>{description}</p> : null}
      {action ? (
        <button className={styles.btn} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

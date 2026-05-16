import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className={styles.wrap}>
          <h2 className={styles.title}>Что-то пошло не так</h2>
          <p className={styles.message}>{this.state.message || 'Неизвестная ошибка'}</p>
          <button className={styles.btn} type="button" onClick={this.handleReload}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

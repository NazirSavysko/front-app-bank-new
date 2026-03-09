import React from 'react';

export interface ErrorFallbackProps {
    onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ onRetry }) => (
    <div role="alert">
        <div className="error-message">Ой! Щось пішло не так. Не вдалося завантажити дані.</div>
        <button className="btn btn-primary" onClick={onRetry}>
            Спробувати знову
        </button>
    </div>
);

export default ErrorFallback;

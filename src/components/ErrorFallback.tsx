import React from 'react';

export interface ErrorFallbackProps {
    onRetry: () => void;
}

const FALLBACK_MESSAGE = 'Ой! Щось пішло не так. Не вдалося завантажити дані.';

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ onRetry }) => (
    <div role="alert">
        <div className="error-message">{FALLBACK_MESSAGE}</div>
        <button className="btn btn-primary" onClick={onRetry}>
            Спробувати знову
        </button>
    </div>
);

export default ErrorFallback;

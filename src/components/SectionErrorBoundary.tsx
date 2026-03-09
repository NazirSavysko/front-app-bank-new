import { Component, type ReactNode } from 'react';
import ErrorFallback from './ErrorFallback';

interface SectionErrorBoundaryProps {
    children: ReactNode;
    onRetry?: () => void;
    resetKey?: string;
}

interface SectionErrorBoundaryState {
    hasError: boolean;
}

class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    state: SectionErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(): SectionErrorBoundaryState {
        return { hasError: true };
    }

    componentDidUpdate(prevProps: SectionErrorBoundaryProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false });
        this.props.onRetry?.();
    };

    render() {
        if (this.state.hasError) {
            return <ErrorFallback onRetry={this.handleRetry} />;
        }

        return this.props.children;
    }
}

export default SectionErrorBoundary;

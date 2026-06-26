import React from 'react';
import OfflineFallback from '../pages/OfflineFallback';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // If the app crashes due to a chunk failing to load while offline, show the fallback
      return <OfflineFallback />;
    }

    return this.props.children;
  }
}

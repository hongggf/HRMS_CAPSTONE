import { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error summary safely without sensitive user/token payload
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an unhandled component error:', {
        message: error.message,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            padding: 24,
          }}
        >
          <Result
            status="500"
            title="Application Error"
            subTitle="Sorry, an unexpected error occurred while rendering this view."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                Reload Page
              </Button>,
              <Button key="home" onClick={this.handleGoHome}>
                Go to Dashboard
              </Button>,
            ]}
          >
            {this.state.error && (
              <div
                style={{
                  textAlign: 'left',
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: 16,
                  borderRadius: 6,
                  maxWidth: 600,
                  margin: '0 auto',
                }}
              >
                <Paragraph>
                  <Text strong>Error Summary:</Text>
                </Paragraph>
                <Text type="danger">{this.state.error.message}</Text>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { spacing, palette } from '@/constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[FLOW] Uncaught error:', error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text variant="hero" style={styles.title}>
            Bir hata oluştu
          </Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Button title="Tekrar Dene" onPress={this.handleRetry} fullWidth />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.deepNavy,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { color: palette.white, textAlign: 'center' },
  message: { color: palette.slateLight, textAlign: 'center' },
});

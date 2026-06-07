import { Redirect } from 'expo-router';

export default function ProductionEntryRedirect() {
  return <Redirect href="/(app)/dashboard" />;
}

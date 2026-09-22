import { Redirect } from 'expo-router';

/** Default demo resident after PCC fixture sync (`res-1`). */
export default function FamilyFeedIndex() {
  return <Redirect href="/family-feed/res-1" />;
}

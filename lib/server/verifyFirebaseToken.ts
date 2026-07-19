type VerifiedUser = {
  uid: string;
  email?: string;
};

export async function verifyFirebaseToken(idToken: string): Promise<VerifiedUser> {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Firebase API key is not configured');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    throw new Error('Invalid authentication token');
  }

  const data = await response.json();
  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error('User not found');
  }

  return {
    uid: user.localId,
    email: user.email,
  };
}

export async function getFirestoreUserData(
  uid: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase project ID is not configured');
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load user profile');
  }

  const doc = await response.json();
  const fields = doc.fields ?? {};
  const data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const field = value as Record<string, unknown>;
    if ('stringValue' in field) data[key] = field.stringValue;
    if ('booleanValue' in field) data[key] = field.booleanValue;
    if ('integerValue' in field) data[key] = Number(field.integerValue);
    if ('doubleValue' in field) data[key] = field.doubleValue;
  }

  return data;
}

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
// Strictly in-memory OAuth access token cache — NEVER store in localStorage or sessionStorage
let cachedAccessToken: string | null = null;

export interface GmailFlowMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export interface GmailFlowStatus {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  flowMessages: GmailFlowMessage[];
  checkedAt: string;
}

export function initAuth(
  onAuthSuccess: (user: User, accessToken: string) => void,
  onAuthSignedOutOrNeedsToken: (user: User | null) => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthSignedOutOrNeedsToken(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthSignedOutOrNeedsToken(null);
    }
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google tidak tersedia dari popup login. Silakan izinkan akses Gmail.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

export async function logout(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export async function fetchGmailFlowStatus(accessToken: string): Promise<GmailFlowStatus> {
  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (profileRes.status === 401 || profileRes.status === 403) {
    cachedAccessToken = null;
    throw new Error('Sesi token Gmail berakhir atau izin ditolak. Silakan hubungkan ulang akun Google Anda.');
  }

  if (!profileRes.ok) {
    throw new Error(`Gagal membaca profil Gmail (HTTP ${profileRes.status}).`);
  }

  const profileData = (await profileRes.json()) as {
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
  };

  const query = encodeURIComponent('(Flow OR Veo OR "Google AI" OR Gemini OR credit OR kredit)');
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=4`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const flowMessages: GmailFlowMessage[] = [];
  if (listRes.ok) {
    const listData = (await listRes.json()) as { messages?: Array<{ id: string }> };
    const messageIds = (listData.messages ?? []).slice(0, 4);

    const details = await Promise.all(
      messageIds.map(async (m) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!msgRes.ok) return null;
        const msgJson = (await msgRes.json()) as {
          id: string;
          snippet?: string;
          payload?: { headers?: Array<{ name: string; value: string }> };
        };
        const headers = msgJson.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        return {
          id: msgJson.id,
          subject: getHeader('Subject') || '(Tanpa Subjek)',
          from: getHeader('From') || 'Google',
          date: getHeader('Date') || '',
          snippet: msgJson.snippet || '',
        };
      })
    );

    for (const d of details) {
      if (d) flowMessages.push(d);
    }
  }

  return {
    emailAddress: profileData.emailAddress || auth.currentUser?.email || '',
    messagesTotal: Number(profileData.messagesTotal ?? 0),
    threadsTotal: Number(profileData.threadsTotal ?? 0),
    flowMessages,
    checkedAt: new Date().toISOString(),
  };
}

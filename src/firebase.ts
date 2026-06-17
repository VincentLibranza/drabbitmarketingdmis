import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import configFromJson from "../firebase-applet-config.json";

// Configure Firebase with support for both Vercel Environment Variables and local applet JSON config fallbacks
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || configFromJson.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || configFromJson.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || configFromJson.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || configFromJson.authDomain,
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || configFromJson.firestoreDatabaseId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || configFromJson.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || configFromJson.messagingSenderId,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
          })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Sync Error]: ', JSON.stringify(errInfo));
  // Do not throw an error, which causes the entire React component lifecycle to crash.
  // Instead, allow the app to run robustly with high-performance Local Database fallback.
}

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Pre-auth background sign in to allow multi-device secure synchronization
signInAnonymously(auth)
  .then(() => {
    console.log("[Firestore Sync] Session authenticated anonymously in cloud.");
  })
  .catch((err) => {
    console.warn("[Firestore Sync] Background session auth failed: ", err);
  });

// Validate Connection on Boot as per Skill directive
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Firestore Sync] Core database is online and reachable.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("[Firestore Sync] Please check your Firebase configuration: Client offline.");
      } else {
        console.error("[Firestore Sync] Verification failed with message:", error.message, error);
      }
    } else {
      console.error("[Firestore Sync] Verification failed with unknown error:", error);
    }
  }
}
testConnection();

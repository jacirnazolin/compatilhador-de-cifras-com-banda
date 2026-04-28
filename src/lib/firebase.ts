/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback for when setup is still pending
const firebaseConfig = {
  apiKey: "AIzaSy_MOCKED_KEY",
  authDomain: "mock.firebaseapp.com",
  projectId: "mock-project",
  storageBucket: "mock.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:mock"
};

// In real AI Studio environment, this comes from firebase-applet-config.json
// Since we handle both cases, we initialize with what's available
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

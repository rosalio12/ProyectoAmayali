import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDIuZ_7N-yp4MYuoALvgaB3pbx6hGkIQSE",
  authDomain: "proyectoraven.firebaseapp.com",
  projectId: "proyectoraven",
  storageBucket: "proyectoraven.appspot.com",
  messagingSenderId: "170922182727",
  appId: "1:170922182727:android:354185807ac6169bf70962",
  databaseURL: "https://proyectoraven.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
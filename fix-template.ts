import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import "dotenv/config";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_TEMPLATE = `==📊 **New Audited Call** ==

👤 **Rep:** {{rep}}
👥 **Prospect:** {{title}}
📅 **Date:** {{date}}
🔗 **Link:** {{link}}
⏱️ **Duration:** {{duration}} min

🔎 **AI Review Summary**
> {{analysis}}

**Quick Stats:**
- **Alignment:** {{alignment}}
- **Score:** {{score}}/100
- **Risk:** {{risk}}

[Full Report]({{link}}) | [Recording]({{transcript}})`;

async function main() {
    const docRef = doc(db, 'settings', 'fireflies_pipeline');
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()) {
        await setDoc(docRef, { clickupTemplate: DEFAULT_TEMPLATE }, { merge: true });
        console.log("Updated ClickUp template in Firebase.");
    } else {
        console.log("No existing settings document found. Skipping.");
    }
}

main().catch(console.error).finally(() => process.exit(0));

import { db } from "../firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CALL_1_SYSTEM_PROMPT, CALL_2_SYSTEM_PROMPT } from "./prompts";

export interface PromptSettings {
    call1Prompt: string;
    call2Prompt: string;
    lastUpdated: Timestamp;
}

const SETTINGS_DOC_ID = "ai_prompts";

export async function getPromptSettings(): Promise<PromptSettings> {
    try {
        const docRef = doc(db, "settings", SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as PromptSettings;
        }

        // Return defaults if not in DB
        return {
            call1Prompt: CALL_1_SYSTEM_PROMPT,
            call2Prompt: CALL_2_SYSTEM_PROMPT,
            lastUpdated: Timestamp.now()
        };
    } catch (error) {
        console.error("Error fetching prompt settings:", error);
        return {
            call1Prompt: CALL_1_SYSTEM_PROMPT,
            call2Prompt: CALL_2_SYSTEM_PROMPT,
            lastUpdated: Timestamp.now()
        };
    }
}

export async function updatePromptSettings(settings: Partial<PromptSettings>) {
    const docRef = doc(db, "settings", SETTINGS_DOC_ID);
    await setDoc(docRef, {
        ...settings,
        lastUpdated: Timestamp.now()
    }, { merge: true });
}

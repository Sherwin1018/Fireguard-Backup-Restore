// scripts/create_user_firestore.js
// Usage:
//   npm install firebase-admin
//   setx GOOGLE_APPLICATION_CREDENTIALS "C:\path\to\serviceAccount.json"    (Windows)
//   node scripts/create_user_firestore.js <uid> <email> <role>
// Example:
//   node scripts/create_user_firestore.js uid123 user@example.com admin

const admin = require("firebase-admin");
const path = require("path");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "\nERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
  );
  console.error("Set it to the path of your service account JSON file.");
  console.error(
    'On Windows (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\\\path\\to\\serviceAccount.json"'
  );
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} catch (err) {
  // ignore if already initialized
}

const firestore = admin.firestore();

async function main() {
  const [uid, email, role] = process.argv.slice(2);
  if (!uid || !role) {
    console.error(
      "Usage: node scripts/create_user_firestore.js <uid> <email> <role>"
    );
    process.exit(1);
  }

  const docRef = firestore.collection("users").doc(uid);
  await docRef.set(
    {
      email: email || null,
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`Wrote users/${uid} (role=${role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

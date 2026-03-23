const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const webpush = require('web-push');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

webpush.setVapidDetails(
  'mailto:hoang1302@example.com',
  process.env.NEXT_PUBLIC_NATIVE_VAPID_KEY,
  process.env.NATIVE_VAPID_PRIVATE_KEY
);

async function testPush() {
  console.log("Fetching Couples...");
  const snapshot = await db.collection('Couples').get();
  let foundSub = null;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.nativePushSubs_partner1 && data.nativePushSubs_partner1.length > 0) {
      foundSub = data.nativePushSubs_partner1[data.nativePushSubs_partner1.length - 1];
      break;
    }
    if (data.nativePushSubs_partner2 && data.nativePushSubs_partner2.length > 0) {
      foundSub = data.nativePushSubs_partner2[data.nativePushSubs_partner2.length - 1];
      break;
    }
  }

  if (!foundSub) {
    console.log("No native subscriptions found in any couple.");
    return;
  }

  console.log("Found subscription endpoint:", foundSub.endpoint);

  const payload = JSON.stringify({
    title: "Test Server Direct",
    body: "Nếu nhận được thì iOS WebPush hoạt động bình thường!",
    url: "/"
  });

  try {
    const res = await webpush.sendNotification(foundSub, payload);
    console.log("Push Success! Response status:", res.statusCode);
  } catch (err) {
    console.error("Push Failed!");
    console.error("Status:", err.statusCode);
    console.error("Body:", err.body);
  }
}

testPush().then(() => process.exit(0));

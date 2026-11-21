# HerMoney Studio — Firebase Setup & Deployment Guide

This guide walks through completing your Firebase project configuration, enabling administrator email/password authentication, enabling image storage, and deploying to Firebase Hosting on the **Spark (Free Tier)** plan.

## 1. Firebase Project
- A Firebase project (`trusty-aleph-640px`) and Cloud Firestore database (`ai-studio-66c0a6d8-d6e6-46bb-a7f7-9f5d4c0a99d7`) have been provisioned and linked in `firebase-applet-config.json` and `.firebaserc`.

## 2. Enable Firebase Authentication (Email & Password)
1. Open the [Firebase Console](https://console.firebase.google.com/) and select project `trusty-aleph-640px`.
2. Navigate to **Authentication → Sign-in method**.
3. Enable **Email/Password** (and optionally keep **Google** enabled).
4. Under **Authentication → Users**, click **Add user** to create your administrator account with email and password.
5. Note that Firestore Security Rules require `email_verified == true`. When signing in for the first time with an unverified Email/Password account, use the built-in **Send Verification Email** prompt on `/admin`.

## 3. Configure the Administrator Email Later
- By default, `firestore.rules` and `src/context/AuthContext.tsx` recognize the project owner email or any UID listed in `/admins/{uid}`.
- To set or change your administrator email later:
  1. Update the email address inside `isBootstrapAdminEmail()` and `isAdmin()` in `firestore.rules` and `BOOTSTRAP_ADMIN_EMAIL` in `src/context/AuthContext.tsx` (or add a document at `admins/<your-auth-uid>` in Firestore Console with `{ email, role: "admin", createdAt: <Timestamp> }`).
  2. Redeploy security rules: `firebase deploy --only firestore:rules`.

## 4. Database Connection
- Firestore is already connected via `firebase-applet-config.json`.
- Public visitors can only read (`get`/`list`) documents in `/articles` where `status == "published"`. Drafts (`status == "draft"`) are strictly blocked for non-administrators.

## 5. Enable Image Storage (Free Spark Tier)
1. In Firebase Console, open **Storage** and click **Get started**.
2. Deploy `storage.rules` using Firebase CLI:
   ```bash
   firebase deploy --only storage
   ```
3. You can also paste external `https://` image URLs directly in the Article Editor at any time without using Storage quota.

## 6. Apply Firebase Security Rules
Firestore rules from `firestore.rules` have been validated with ESLint and deployed. If you edit `firestore.rules` later, run:
```bash
npx eslint firestore.rules
firebase deploy --only firestore:rules
```

## 7. Environment Variables
- Public Firebase web configuration lives in `firebase-applet-config.json` (no private secrets are exposed in frontend code).
- Keep `.env.example` free of sensitive credentials.

## 8. Deploy to Firebase Hosting (Free URL)
Install the Firebase CLI if needed (`npm install -g firebase-tools`), authenticate (`firebase login`), then build and deploy:
```bash
npm run build
firebase deploy --only hosting
```
Your website will be live at your free temporary URL: `https://trusty-aleph-640px.web.app`.

## 9. Connect a Custom Domain Later
1. In Firebase Console → **Hosting → Add custom domain**.
2. Enter your domain name and add the DNS verification TXT and A records at your domain registrar.
3. Firebase Hosting automatically provisions a free SSL/TLS certificate (included in the Spark free tier).

## Backup Cost Transparency
- **Free Tier (Included):** Full JSON export/import and Firestore snapshot audit logs inside the Editorial Desk Backups tab run on the Spark free tier.
- **Paid Plan Required (Blaze):** Google Cloud automated scheduled Firestore exports (`gcloud firestore export` to Cloud Storage) and Point-in-Time Recovery (PITR) require upgrading to the pay-as-you-go Blaze plan.

# Local Deployment Guide for SUSE DocEngine

Follow these steps to run the SUSE DocEngine on your local machine.

## Prerequisites
- Node.js (v18 or higher)
- A Firebase project (or use the one provided in the app)
- A Google Cloud Project for Gemini API (optional, as we just moved to non-AI logic for transformation)

## Steps

### 1. Extract the Project
Download the source code and unzip it to a folder.

### 2. Install Dependencies
Open your terminal in the project root and run:
```bash
npm install
```

### 3. Setup Firebase Config
The application needs the `src/firebase-applet-config.json` file. Ensure it contains your Firebase project credentials. You can get these from the Firebase Console (Project Settings -> General -> Your apps -> SDK setup and configuration).

### 4. Setup Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Required for any remaining AI features (if any)
GEMINI_API_KEY=your_gemini_api_key

# If you use Firebase Admin SDK features locally
# FIREBASE_PROJECT_ID=...
```

### 5. Google OAuth Setup (For Google Docs Integration)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select existing.
3. Enable "Google Docs API" and "Google Drive API".
4. Setup "OAuth consent screen".
5. Create "OAuth 2.0 Client IDs" (Web application).
6. Add `http://localhost:3000` to "Authorized JavaScript origins".
7. Update the `clientId` in `src/pages/Login.tsx` or where auth is initialized.

### 6. Run the Application
Start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## Local-First Storage
The application has been refined to store all transformation data locally:
- **Jobs & History**: Stored in `data/jobs.json` on the server.
- **Tokens & Config**: Stored in the browser's `localStorage`.
- **Firebase**: Only required for the initial Google Login handshake ("Logging").

## Notes on SUSE Document Transformation
The transformation logic is now local (non-AI) and uses `mammoth` for Docx parsing and custom regex logic in `server.ts` to convert HTML to AsciiDoc.

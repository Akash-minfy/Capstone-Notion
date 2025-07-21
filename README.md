# Notion Clone – Collaborative Document Editor

A full-stack collaborative document editor inspired by Notion, featuring real-time editing, inline comments, user mentions, and sharing capabilities. Built with React, Vite, Firebase, Express, and Socket.io.

## Features

- **Real-time collaborative editing** with live cursor tracking (Socket.io)
- **Rich text editing** powered by Tiptap (ProseMirror)
- **Inline comments** with @mentions and notifications
- **Document sharing** with granular permissions (view/edit, public/private)
- **Authentication** via Firebase Auth
- **Persistent storage** using Firestore
- **Responsive, modern UI** with Tailwind CSS

---

## Project Structure

```text
Capstone-Notion/
  backend/      # Express + Socket.io server, Firebase Admin
  frontend/     # React + Vite client, Tiptap editor, Firebase client
```

---

## Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- A Firebase project (for Auth and Firestore)
- (Optional) A Firebase service account key for backend admin

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Akash-minfy/Capstone-Notion.git
cd Capstone-Notion
```

---

### 2. Firebase Setup

#### a. Create a Firebase Project

- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Enable **Authentication** (Email/Password)
- Create a **Firestore Database**
- (Optional) Set up **Storage** if you want file uploads

#### b. Get Firebase Config

- In your Firebase project settings, find your web app's config (apiKey, authDomain, etc.)

#### c. Set up Frontend Environment Variables

Create a `.env` file in `frontend/`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### d. Set up Backend Service Account

- In Firebase Console, go to Project Settings > Service Accounts
- Generate a new private key and download the `firebase-service-account.json`
- Place it in `backend/firebase/` as `firebase-service-account.json`

#### e. Backend Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=5000
FIREBASE_STORAGE_BUCKET=your_storage_bucket
CLIENT_URL=http://localhost:5173
```

---

### 3. Install Dependencies

#### Frontend

```bash
cd frontend
npm install
```

#### Backend

```bash
cd ../backend
npm install
```

---

### 4. Run the Application

#### Start Backend Server

```bash
npm start
```

#### Start Frontend (in a new terminal)

```bash
cd ../frontend
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

---

## Usage

- Register or log in with your email.
- Create, edit, and share documents.
- Collaborate in real-time with others.
- Add inline comments and mention collaborators with `@`.

---

## Tech Stack

- **Frontend:** React, Vite, Tiptap, Tailwind CSS, Firebase JS SDK, Socket.io-client
- **Backend:** Express, Socket.io, Firebase Admin SDK
- **Database:** Firestore

---

## Notes

- Make sure your Firebase rules allow the necessary read/write access for authenticated users and public sharing if enabled.
- The backend requires the Firebase service account key for admin access.
- For production, update CORS and environment variables accordingly.

---


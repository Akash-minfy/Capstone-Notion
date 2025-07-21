import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc , getDoc} from "firebase/firestore";


export default function Navbar() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", user.email)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  
const handleNotificationClick = async (notification) => {
  try {
     
    const docRef = doc(db, "documents", notification.docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      navigate(`/doc/${notification.docId}`);
    } else {
      console.error("Document not found");
    }
  } catch (error) {
    console.error("Error navigating to document:", error);
  }
  setShowNotifications(false);
};

  return (
    <nav className="w-full bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
      <div className="text-2xl font-bold text-black flex items-center">
        <img src="../notion icon.png" className="h-8 w-12" alt="Notion Logo" />
        Notion
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-gray-100 relative"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg py-1 z-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-700">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-b"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.type === 'mention' ? (
                      <>
                        <div className="font-medium text-blue-700">@ Mention from {notification.senderEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          In <span className="font-semibold">{notification.docTitle || 'Untitled'}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1 italic truncate max-w-full">
                          "{notification.commentText}"
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-medium">{notification.senderEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Shared "{notification.docTitle}" - {notification.permission}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  or,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import io from "socket.io-client";
import { debounce } from "lodash";
import Navbar from "./Navbar";
import EditorPane from "./Editor";

const socket = io("http://localhost:5000", {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocData, setSelectedDocData] = useState(null);
  const [editTitleId, setEditTitleId] = useState(null);
  const [titleInputs, setTitleInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const isUpdatingRef = useRef(false);
  const lastUpdateRef = useRef(0);
  const docsListenerRef = useRef(null);
  const docListenerRef = useRef(null);
  const lastContentRef = useRef("");
  const skipNextUpdateRef = useRef(false);

  const updateFirestore = useCallback(
    debounce(async (html) => {
      if (!selectedDocId || isCreatingDoc || isUpdatingRef.current || skipNextUpdateRef.current) {
        skipNextUpdateRef.current = false;
        return;
      }
      if (html === lastContentRef.current) return;
      
      const now = Date.now();
      if (now - lastUpdateRef.current < 500) return;
      
      try {
        isUpdatingRef.current = true;
        lastUpdateRef.current = now;
        lastContentRef.current = html;
        
        const docRef = doc(db, "documents", selectedDocId);
        await updateDoc(docRef, {
          content: html,
          updatedAt: now,
        });
      } catch (error) {
        console.error("Failed to update document:", error);
        setError("Failed to save changes");
      } finally {
        isUpdatingRef.current = false;
      }
    }, 1000),
    [selectedDocId, isCreatingDoc]
  );

  const editor = useEditor(
    {
      extensions: [StarterKit],
      content: selectedDocData?.content || "",
      editable: !!selectedDocId,
      editorProps: {
        attributes: {
          class: "prose p-6 bg-white min-h-screen focus:outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        if (!selectedDocId || isCreatingDoc || isUpdatingRef.current) return;
        const html = editor.getHTML();
        if (html === lastContentRef.current) return;
        updateFirestore(html);
        socket.emit("doc-update", { 
          docId: selectedDocId, 
          content: html,
          updatedAt: Date.now()
        });
      },
    },
    [selectedDocId, selectedDocData?.content]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate("/");
        return;
      }
      setUser(currentUser);
      try {
        await loadDocs(currentUser.uid);
        socket.auth = { userId: currentUser.uid };
        socket.connect();
      } catch (err) {
        setError("Failed to load documents");
        console.error("Auth error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadDocs = useCallback(async (uid) => {
    try {
      const q = query(
        collection(db, "documents"),
        or(
          where("owner", "==", uid),
          where("collaborators", "array-contains", auth.currentUser.email)
        )
      );
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocs(documents);
      
      const initialTitleInputs = {};
      documents.forEach((doc) => {
        initialTitleInputs[doc.id] = doc.title;
      });
      setTitleInputs(initialTitleInputs);
    } catch (error) {
      console.error("Error loading documents:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    if (docsListenerRef.current) {
      docsListenerRef.current();
    }
    
    const q = query(
      collection(db, "documents"),
      or(
        where("owner", "==", user.uid),
        where("collaborators", "array-contains", user.email)
      )
    );
    
    docsListenerRef.current = onSnapshot(q, (snapshot) => {
      const updatedDocs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocs(updatedDocs);
    }, (error) => {
      console.error("Documents listener error:", error);
    });

    return () => {
      if (docsListenerRef.current) {
        docsListenerRef.current();
      }
    };
  }, [user]);

  useEffect(() => {
    if (!selectedDocId || isCreatingDoc) return;
    
    if (docListenerRef.current) {
      docListenerRef.current();
    }
    
    const docRef = doc(db, "documents", selectedDocId);
    docListenerRef.current = onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data();
        
        if (!isUpdatingRef.current) {
          setSelectedDocData(docData);
          
          if (editor) {
            const editorHtml = editor.getHTML();
            if (docData.content !== editorHtml) {
              skipNextUpdateRef.current = true;
              lastContentRef.current = docData.content || "";
              editor.commands.setContent(docData.content || "", false);
            }
          }
        }
      }
    }, (error) => {
      console.error("Document listener error:", error);
    });

    return () => {
      if (docListenerRef.current) {
        docListenerRef.current();
      }
    };
  }, [selectedDocId, editor, isCreatingDoc]);

  useEffect(() => {
    if (!socket.connected) return;

    const handleDocUpdate = ({ docId, content }) => {
      if (docId === selectedDocId && editor && !isCreatingDoc && !isUpdatingRef.current) {
        const { from, to } = editor.state.selection;
        skipNextUpdateRef.current = true;
        editor.commands.setContent(content, false);
        editor.commands.setTextSelection({ from, to });
      }
    };

    const handleError = (err) => {
      console.error("Socket error:", err);
      setError("Connection error. Please refresh the page.");
    };

    socket.on("doc-update", handleDocUpdate);
    socket.on("connect_error", handleError);

    return () => {
      socket.off("doc-update", handleDocUpdate);
      socket.off("connect_error", handleError);
    };
  }, [selectedDocId, editor, isCreatingDoc]);

      const newDoc = async () => {
      try {
        setIsCreatingDoc(true);
        isUpdatingRef.current = true;
        
        const newDocData = {
          title: "Untitled",
          content: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          owner: user.uid,
          ownerEmail: user.email,
          collaborators: [user.email],
          collaboratorEmails: [user.email],
          anyoneCanAccess: false,
        };
        
        const docRef = await addDoc(collection(db, "documents"), newDocData);
        
        socket.emit("join-doc", docRef.id);
        
        // Update the selected document data immediately
        setSelectedDocData({
          id: docRef.id,
          ...newDocData
        });
        
        setSelectedDocId(docRef.id);
        setEditTitleId(docRef.id);
        setTitleInputs((prev) => ({ ...prev, [docRef.id]: "Untitled" }));
        
      } catch (error) {
        console.error("Error creating document:", error);
        setError("Failed to create document");
      } finally {
        setIsCreatingDoc(false);
        isUpdatingRef.current = false;
      }
    };

  // Update openDoc to accept a searchTerm and use navigate
  const openDoc = async (id) => {
    if (id === selectedDocId) return;
    try {
      if (selectedDocId) {
        socket.emit("leave-doc", selectedDocId);
      }
      setSelectedDocId(id);
      socket.emit("join-doc", id);
    } catch (error) {
      console.error("Error opening document:", error);
      setError("Failed to open document");
    }
  };

  const renameDoc = async (id, newTitle) => {
    const finalTitle = newTitle.trim() || "Untitled";
    
    try {
      const docRef = doc(db, "documents", id);
      await updateDoc(docRef, { 
        title: finalTitle,
        updatedAt: Date.now()
      });
      
      setEditTitleId(null);
    } catch (error) {
      console.error("Rename error:", error);
      setError("Failed to rename document");
    }
  };

  const handleTitleChange = (id, value) => {
    setTitleInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleTitleKeyDown = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      renameDoc(id, titleInputs[id]);
    } else if (e.key === "Escape") {
      setEditTitleId(null);
    }
  };

  const deleteDocument = async (id) => {
    const docToDelete = docs.find((d) => d.id === id);
    if (!docToDelete) return;
    
    if (docToDelete.owner !== user.uid) {
      setError("Only the owner can delete this document.");
      return;
    }
    
    try {
      await deleteDoc(doc(db, "documents", id));
      
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setSelectedDocData(null);
        socket.emit("leave-doc", id);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setError("Failed to delete document");
    }
  };

  // Filtered docs based on search term
  const filteredDocs = docs.filter(doc => {
    const title = (doc.title || "").toLowerCase();
    const content = (doc.content || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return title.includes(term) || content.includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white p-6 border-r shadow-sm flex flex-col gap-6 min-h-0">
          <button
            className="w-full py-3 bg-black text-white rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors shadow-md"
            onClick={newDoc}
            disabled={!user || isCreatingDoc}
          >
            {isCreatingDoc ? "Creating..." : "+ New Document"}
          </button>
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredDocs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No documents found</p>
            ) : (
              <ul className="space-y-2">
                {filteredDocs.map((document) => {
                  const isOwner = document.owner === user?.uid;
                  const isSelected = document.id === selectedDocId;
                  return (
                    <li
                      key={document.id}
                      className={`p-3 rounded-xl cursor-pointer flex justify-between items-center border transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 shadow'
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      {editTitleId === document.id ? (
                        <input
                          autoFocus
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          value={titleInputs[document.id] ?? document.title}
                          onChange={(e) => handleTitleChange(document.id, e.target.value)}
                          onKeyDown={(e) => handleTitleKeyDown(e, document.id)}
                          onBlur={() => renameDoc(document.id, titleInputs[document.id])}
                        />
                      ) : (
                        <span
                          onClick={() => openDoc(document.id)}
                          className={`flex-1 truncate ${
                            isOwner ? "text-black" : "text-blue-700 font-semibold"
                          }`}
                        >
                          {document.title || "Untitled"}
                          {!isOwner && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded">
                              Shared
                            </span>
                          )}
                        </span>
                      )}
                      <div className="ml-2 flex-shrink-0 flex items-center gap-1">
                        {isOwner && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTitleId(document.id);
                                setTitleInputs((prev) => ({
                                  ...prev,
                                  [document.id]: document.title,
                                }));
                              }}
                              className="p-1 hover:bg-gray-200 rounded"
                              aria-label="Edit title"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this document?")) {
                                  deleteDocument(document.id);
                                }
                              }}
                              className="p-1 text-red-500 hover:bg-gray-200 rounded"
                              aria-label="Delete document"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <div className="p-6 border-b bg-white sticky top-0 z-10 flex items-center gap-4 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 flex-1 truncate">
              {selectedDocData?.title || "Select or create a document"}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {selectedDocId ? (
              <EditorPane
                editor={editor}
                docId={selectedDocId}
                docData={selectedDocData}
                onTitleChange={(newTitle) => {
                  setSelectedDocData((prev) => ({ ...prev, title: newTitle }));
                  setDocs((prev) =>
                    prev.map((d) =>
                      d.id === selectedDocId ? { ...d, title: newTitle } : d
                    )
                  );
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 text-gray-500">
                  <p className="text-lg mb-4">
                    {docs.length > 0 
                      ? "Select a document from the sidebar" 
                      : "Create your first document"}
                  </p>
                  {docs.length === 0 && (
                    <button
                      onClick={newDoc}
                      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                    >
                      Create Document
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
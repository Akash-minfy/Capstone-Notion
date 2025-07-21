import React, { useEffect, useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection, onSnapshot, deleteDoc, setDoc, getDocs } from "firebase/firestore";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { debounce } from "lodash";
import { useLocation } from "react-router-dom";
import io from "socket.io-client";
import { db, auth } from "../firebase";
import {
  BoldIcon, ItalicIcon, StrikethroughIcon, CodeIcon,
  Heading1Icon, Heading2Icon, Heading3Icon, ListIcon,
  ListOrderedIcon, Code2Icon, QuoteIcon, MinusIcon,
  WrapTextIcon, UndoIcon, RedoIcon, PilcrowIcon
} from "lucide-react";
import ShareModal from "../components/ShareModal";
import { useAuthState } from "react-firebase-hooks/auth";
import { Mark } from '@tiptap/core';
import { Decoration, DecorationSet } from 'prosemirror-view';

const socket = io("http://localhost:5000");

// Inline Comment Tiptap Extension
const CommentMark = Mark.create({
  name: 'comment',
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      commentId: {
        default: null,
      },
      author: {
        default: null,
      },
      status: {
        default: 'open',
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-comment-id': HTMLAttributes.commentId,
        'data-author': HTMLAttributes.author,
        'data-status': HTMLAttributes.status,
        style: 'background: #fff3cd; border-bottom: 2px dotted #ffc107; cursor: pointer;',
      },
      0,
    ];
  },
});

function getRandomColor(uid) {
  // Simple hash to color
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  const color = `hsl(${hash % 360}, 80%, 70%)`;
  return color;
}

function MenuBar({ editor }) {
  const editorState = useEditorState({
    editor,
    selector: ctx => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isStrike: ctx.editor.isActive("strike"),
      isCode: ctx.editor.isActive("code"),
      isHeading1: ctx.editor.isActive("heading", { level: 1 }),
      isHeading2: ctx.editor.isActive("heading", { level: 2 }),
      isHeading3: ctx.editor.isActive("heading", { level: 3 }),
      isParagraph: ctx.editor.isActive("paragraph"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      isCodeBlock: ctx.editor.isActive("codeBlock"),
      isBlockquote: ctx.editor.isActive("blockquote"),
      canUndo: ctx.editor.can().chain().focus().undo().run(),
      canRedo: ctx.editor.can().chain().focus().redo().run(),
    }),
  });

  if (!editor) return null;

  const exec = command => () => setTimeout(command, 0);

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-20 shadow-sm rounded-t-xl">
      <button title="Bold" onClick={exec(() => editor.chain().focus().toggleBold().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isBold ? 'bg-gray-200' : ''}`}><BoldIcon size={18} /></button>
      <button title="Italic" onClick={exec(() => editor.chain().focus().toggleItalic().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isItalic ? 'bg-gray-200' : ''}`}><ItalicIcon size={18} /></button>
      <button title="Strikethrough" onClick={exec(() => editor.chain().focus().toggleStrike().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isStrike ? 'bg-gray-200' : ''}`}><StrikethroughIcon size={18} /></button>
      <button title="Inline Code" onClick={exec(() => editor.chain().focus().toggleCode().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isCode ? 'bg-gray-200' : ''}`}><CodeIcon size={18} /></button>
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      <button title="Heading 1" onClick={exec(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isHeading1 ? 'bg-gray-200' : ''}`}><Heading1Icon size={18} /></button>
      <button title="Heading 2" onClick={exec(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isHeading2 ? 'bg-gray-200' : ''}`}><Heading2Icon size={18} /></button>
      <button title="Heading 3" onClick={exec(() => editor.chain().focus().toggleHeading({ level: 3 }).run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isHeading3 ? 'bg-gray-200' : ''}`}><Heading3Icon size={18} /></button>
      <button title="Paragraph" onClick={exec(() => editor.chain().focus().setParagraph().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isParagraph ? 'bg-gray-200' : ''}`}><PilcrowIcon size={18} /></button>
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      <button title="Bullet List" onClick={exec(() => editor.chain().focus().toggleBulletList().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isBulletList ? 'bg-gray-200' : ''}`}><ListIcon size={18} /></button>
      <button title="Numbered List" onClick={exec(() => editor.chain().focus().toggleOrderedList().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isOrderedList ? 'bg-gray-200' : ''}`}><ListOrderedIcon size={18} /></button>
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      <button title="Code Block" onClick={exec(() => editor.chain().focus().toggleCodeBlock().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isCodeBlock ? 'bg-gray-200' : ''}`}><Code2Icon size={18} /></button>
      <button title="Blockquote" onClick={exec(() => editor.chain().focus().toggleBlockquote().run())} className={`p-2 rounded-lg hover:bg-gray-100 ${editorState.isBlockquote ? 'bg-gray-200' : ''}`}><QuoteIcon size={18} /></button>
      <button title="Divider" onClick={exec(() => editor.chain().focus().setHorizontalRule().run())} className="p-2 rounded-lg hover:bg-gray-100"><MinusIcon size={18} /></button>
      <button title="Line Break" onClick={exec(() => editor.chain().focus().setHardBreak().run())} className="p-2 rounded-lg hover:bg-gray-100"><WrapTextIcon size={18} /></button>
      <div className="w-px h-6 bg-gray-200 mx-2"></div>
      <button title="Undo" onClick={exec(() => editor.chain().focus().undo().run())} disabled={!editorState.canUndo} className="p-2 rounded-lg hover:bg-gray-100"><UndoIcon size={18} /></button>
      <button title="Redo" onClick={exec(() => editor.chain().focus().redo().run())} disabled={!editorState.canRedo} className="p-2 rounded-lg hover:bg-gray-100"><RedoIcon size={18} /></button>
    </div>
  );
}

MenuBar.propTypes = {
  editor: PropTypes.object,
};

export default function EditorPane({ docId, docData: propDocData, editor: propEditor, onTitleChange }) {
  const [user, userLoading] = useAuthState(auth); // get loading state
  const [docData, setDocData] = useState(propDocData);
  const [hasPermission, setHasPermission] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSharedLinkAccess, setIsSharedLinkAccess] = useState(false);
  const lastContentRef = useRef("");
  const location = useLocation();
  const [showCommentButton, setShowCommentButton] = useState(false);
  const [selectionRange, setSelectionRange] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAnchor, setCommentAnchor] = useState({ x: 0, y: 0 });
  const [comments, setComments] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState({}); // { userId: { pos, name, color } }

   
 useEffect(() => {
    setIsSharedLinkAccess(location.pathname.startsWith('/doc/'));
  }, [location]);

  // Check permissions function
  const checkPermissions = (data) => {
    // Owner always has full permissions
    if (user && data.owner === user.uid) {
      setHasPermission(true);
      return;
    }

    // For shared link access
    if (isSharedLinkAccess) {
      if (data.anyoneCanAccess) {
        setHasPermission(data.anyoneCanEdit ? true : "view");
        return;
      } else if (user) {
        const collaborator = data.collaborators?.find(c => c.email === user.email);
        setHasPermission(collaborator?.permission === "can edit");
        return;
      } else {
        setHasPermission(false);
        return;
      }
    } 
    // For dashboard access
    if (user) {
      if (data.owner === user.uid) {
        setHasPermission(true);
        return;
      }
      const collaborator = data.collaborators?.find(c => c.email === user.email);
      setHasPermission(!!collaborator);
      return;
    }
    setHasPermission(false);
  };

 
  useEffect(() => {
    if (!docId) return;
    if (userLoading) return; // wait for user to finish loading
    // Do NOT return if !user; allow fetch for public access
    if (propDocData) {
      setDocData(propDocData);
      lastContentRef.current = propDocData.content || "";
      checkPermissions(propDocData);
      return;
    }

    
    const fetchDocData = async () => {
      try {
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDocData(data);
          lastContentRef.current = data.content || "";
          checkPermissions(data);
        } else {
          console.error("Document not found");
        }
      } catch (error) {
        console.error("Error loading document:", error);
      }
    };

    fetchDocData();
  }, [docId, propDocData, user, userLoading, isSharedLinkAccess]);

  const updateFirestore = useCallback(
    debounce(async (html) => {
      if (!docId || !user || !hasPermission) return;

      try {
        const docRef = doc(db, "documents", docId);
        await updateDoc(docRef, {
          content: html,
          updatedAt: serverTimestamp(),
          lastUpdatedBy: user.uid
        });
      } catch (error) {
        console.error("Error updating document:", error);
      }
    }, 1000),
    [docId, user, hasPermission]
  );

  // Initialize editor
  const editor = useEditor({
    editable: hasPermission === true,
    autofocus: hasPermission === true ? "end" : false,
    extensions: [
      StarterKit.configure({ table: false, history: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'Start typing or type "/" for commands...',
      }),
      CommentMark,
    ],
    content: docData?.content || "",
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl !max-w-none p-6 min-h-[500px] focus:outline-none w-full ${hasPermission === true ? '' : 'pointer-events-none'}`,
      },
      handleDOMEvents: {
        mouseup: (view, event) => {
          if (!editor) return false;
          const { from, to } = editor.state.selection;
          if (from !== to) {
            // Show comment button at mouse position
            setShowCommentButton(true);
            setSelectionRange({ from, to });
            setCommentAnchor({ x: event.clientX, y: event.clientY });
          } else {
            setShowCommentButton(false);
            setSelectionRange(null);
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (!docId || hasPermission !== true) return;
      const html = editor.getHTML();
      
      if (html !== lastContentRef.current) {
        lastContentRef.current = html;
        updateFirestore(html);
        socket.emit("send-changes", { 
          docId, 
          delta: html,
          userId: user?.uid 
        });
      }
    },
  });

  
  // After content is loaded, scroll to search term if present
  useEffect(() => {
    if (editor && docData) {
      editor.commands.setContent(docData.content || "");
      lastContentRef.current = docData.content || "";
    }
  }, [docData, editor]);

  // Socket.io real-time collaboration
  useEffect(() => {
    if (!docId || !editor) return;

    socket.emit("join-doc", docId);

    const handleRemoteUpdate = ({ delta, userId }) => {
      // If user is logged in, skip own changes
      if (user && userId === user.uid) return;
      const currentHTML = editor.getHTML();
      if (currentHTML !== delta && !editor.isFocused) {
        editor.commands.setContent(delta, false);
        lastContentRef.current = delta;
      }
    };

    socket.on("receive-changes", handleRemoteUpdate);

    return () => {
      socket.off("receive-changes");
      socket.emit("leave-doc", docId);
    };
  }, [docId, editor, user]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(hasPermission === true);
    }
  }, [editor, hasPermission]);

  // Helper: extract mentioned emails from comment text
  function extractMentions(text, collaborators) {
    if (!collaborators) return [];
    const emails = collaborators
      .map(c => (typeof c === 'string' ? c : c?.email))
      .filter(Boolean);  
    // Match @username or @email
    const regex = /@([\w.-]+@[\w.-]+|[\w.-]+)/g;
    const found = [];
    let match;
    while ((match = regex.exec(text))) {
      const mention = match[1];
      const byEmail = emails.find(e => e && e.toLowerCase() === mention.toLowerCase());
      if (byEmail) found.push(byEmail);
      else {
        const byName = emails.find(e => e && e.split('@')[0].toLowerCase() === mention.toLowerCase());
        if (byName) found.push(byName);
      }
    }
    return Array.from(new Set(found));
  }

  // Helper: render comment text with @mentions highlighted
  function renderMentionedText(text) {
    const regex = /(@[\w.-]+@[\w.-]+|@[\w.-]+)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (regex.test(part)) {
        return <span key={i} style={{ color: '#2563eb', fontWeight: 600 }}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  const handleAddComment = async () => {
    if (!selectionRange || !commentText.trim()) return;
    const commentRef = await addDoc(collection(db, 'documents', docId, 'comments'), {
      from: selectionRange.from,
      to: selectionRange.to,
      text: commentText,
      author: user.uid,
      authorEmail: user.email,
      createdAt: serverTimestamp(),
      status: 'open',
    });
     
    editor.chain().focus().setTextSelection({ from: selectionRange.from, to: selectionRange.to })
      .setMark('comment', { commentId: commentRef.id, author: user.uid, status: 'open' })
      .run();
    // Immediately save updated HTML to Firestore
    const html = editor.getHTML();
    try {
      const docRef = doc(db, "documents", docId);
      await updateDoc(docRef, {
        content: html,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: user.uid
      });
    } catch (error) {
      console.error("Error updating document after comment:", error);
    }
    // --- Mention detection and notification ---
    if (docData && docData.collaborators) {
      const mentioned = extractMentions(commentText, docData.collaborators);
      for (const email of mentioned) {
        // Send notification
        await addDoc(collection(db, 'notifications'), {
          recipientEmail: email,
          senderEmail: user.email,
          docId,
          docTitle: docData.title || '',
          commentId: commentRef.id,
          commentText,
          createdAt: serverTimestamp(),
          type: 'mention',
        });
      }
    }
    setShowCommentModal(false);
    setShowCommentButton(false);
    setCommentText('');
    setSelectionRange(null);
  };

  // Fetch comments: use onSnapshot for authenticated users, getDocs for public
  useEffect(() => {
    if (!docId) return;
    let unsub = null;
    if (user) {
      unsub = onSnapshot(collection(db, 'documents', docId, 'comments'), (snap) => {
        setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      // For public users, fetch comments once
      getDocs(collection(db, 'documents', docId, 'comments')).then(snap => {
        setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }).catch(() => setComments([]));
    }
    return () => { if (unsub) unsub(); };
  }, [docId, user]);

  // Listen for clicks on comment marks
  useEffect(() => {
    if (!editor) return;
    const handler = (event) => {
      if (showCommentModal) return;
      const target = event.target;
      if (target && target.nodeType === 1 && target.hasAttribute('data-comment-id')) {
        const commentId = target.getAttribute('data-comment-id');
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
          setActiveComment(comment);
          setPopupPos({ x: event.clientX, y: event.clientY });
        }
      } else {
        setActiveComment(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [editor, comments, showCommentModal]);

 
  // Handle delete
  const handleDelete = async (comment) => {
    if (!comment) return;
    const commentRef = doc(db, 'documents', docId, 'comments', comment.id);
    await deleteDoc(commentRef);
    editor.commands.command(({ tr, state }) => {
      state.doc.descendants((node, pos) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type.name === 'comment' && mark.attrs.commentId === comment.id) {
              try {
                tr.removeMark(pos, pos + node.nodeSize, mark.type);
              } catch (e) {
                // Ignore invalid ranges
              }
            }
          });
        }
      });
      editor.view.dispatch(tr);
      return true;
    });
    setActiveComment(null);
  };

   
  useEffect(() => {
    if (!editor || !user) return;
    const sendCursor = () => {
      const { from, to } = editor.state.selection;
      socket.emit('cursor-update', {
        docId,
        userId: user.uid,
        name: user.displayName || user.email,
        color: getRandomColor(user.uid),
        from,
        to,
      });
    };
    editor.on('selectionUpdate', sendCursor);
    return () => editor.off('selectionUpdate', sendCursor);
  }, [editor, user, docId]);

  // Listen for remote cursor updates
  useEffect(() => {
    if (!editor) return;
    const handler = (data) => {
      if (data.userId !== user?.uid && data.docId === docId) {
        setRemoteCursors(prev => ({ ...prev, [data.userId]: data }));
      }
    };
    socket.on('remote-cursor-update', handler);
    return () => socket.off('remote-cursor-update', handler);
  }, [editor, user, docId]);

  // Remove remote cursor when user leaves
  useEffect(() => {
    if (!editor) return;
    const handler = (data) => {
      if (data.userId !== user?.uid && data.docId === docId) {
        setRemoteCursors(prev => {
          const copy = { ...prev };
          delete copy[data.userId];
          return copy;
        });
      }
    };
    socket.on('remote-cursor-remove', handler);
    return () => socket.off('remote-cursor-remove', handler);
  }, [editor, user, docId]);

  // Tiptap decoration for remote cursors
  useEffect(() => {
    if (!editor || !editor.view) return;
    try {
      const decorations = [];
      Object.values(remoteCursors).forEach(({ from, to, name, color, userId }) => {
        if (typeof from === 'number') {
          decorations.push(
            Decoration.widget(from, () => {
              const el = document.createElement('span');
              el.style.borderLeft = `2px solid ${color}`;
              el.style.marginLeft = '-1px';
              el.style.height = '1em';
              el.style.position = 'relative';
              el.style.zIndex = 10;
              el.className = 'remote-cursor';
              const label = document.createElement('span');
              label.textContent = name || 'User';
              label.style.background = color;
              label.style.color = '#222';
              label.style.fontSize = '0.75em';
              label.style.position = 'absolute';
              label.style.left = '2px';
              label.style.top = '-1.5em';
              label.style.padding = '0 4px';
              label.style.borderRadius = '4px';
              label.style.whiteSpace = 'nowrap';
              el.appendChild(label);
              return el;
            }, { side: -1 })
          );
        }
      });
      const decoSet = DecorationSet.create(editor.state.doc, decorations);
      if (editor && editor.view) {
        editor.view.setProps({ decorations: () => decoSet });
      }
      return () => {
        if (editor && editor.view) {
          try {
            editor.view.setProps({ decorations: () => DecorationSet.empty });
          } catch (e) {
            console.warn('Failed to clear decorations:', e);
          }
        }
      };
    } catch (e) {
      console.warn('Failed to set decorations:', e);
    }
  }, [editor, remoteCursors]);

  if (!docId) {
    return (
      <div className="mt-4 bg-white rounded-lg shadow border border-gray-200 overflow-hidden p-6 text-center text-gray-500">
        <p>Select or create a document to start editing</p>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="mt-4 bg-white rounded-lg shadow border border-gray-200 overflow-hidden p-6 text-center text-gray-500">
        <p>Loading user...</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="mt-4 bg-white rounded-lg shadow border border-gray-200 overflow-hidden p-6 text-center text-gray-500">
        <p>Loading document...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-2">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
        {editor && hasPermission && <MenuBar editor={editor} />}
        <div className="flex justify-between items-center px-8 py-4 border-b bg-gray-50">
          <h3 className="text-2xl font-bold text-gray-900 truncate">{docData.title || "Untitled Document"}</h3>
          {!isSharedLinkAccess && hasPermission && (
            <button
              onClick={() => setShowShareModal(true)}
              className="text-sm text-blue-600 hover:underline font-semibold px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
            >
              Share
            </button>
          )}
        </div>
        {hasPermission === null ? (
          <div className="p-8 text-center text-gray-500">Loading permissions...</div>
        ) : (
          <div className="relative px-4 py-6 md:px-8 min-h-[500px]">
            <EditorContent editor={editor} />
            {showCommentButton && selectionRange && (
              <button
                style={{ position: 'fixed', left: commentAnchor.x + 10, top: commentAnchor.y, zIndex: 1000 }}
                className="bg-yellow-400 text-black px-2 py-1 rounded shadow"
                onClick={e => { e.stopPropagation(); setShowCommentModal(true); }}
              >
                Comment
              </button>
            )}
            {showCommentModal && (
              (() => {
                const modalHeight = 180;  
                const margin = 16;
                const showAbove = (commentAnchor.y + 30 + modalHeight + margin) > window.innerHeight;
                const top = showAbove
                  ? Math.max(commentAnchor.y - modalHeight - margin, margin)
                  : commentAnchor.y + 30;
                const arrowStyle = {
                  position: 'absolute',
                  left: 24,
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  zIndex: 1002,
                  ...(showAbove
                    ? { borderBottom: '8px solid #fff', top: '100%' }
                    : { borderTop: '8px solid #fff', bottom: '100%' }),
                };
                return (
                  <div
                    style={{
                      position: 'fixed',
                      left: `min(${commentAnchor.x + 10}px, calc(100vw - 320px - 8px))`,
                      top,
                      zIndex: 1001,
                      maxWidth: '95vw',
                      width: 320,
                      boxSizing: 'border-box',
                    }}
                    className="bg-white border rounded-xl shadow-lg p-4"
                    id="comment-modal"
                  >
                    <div style={arrowStyle}></div>
                    <textarea
                      className="w-full h-20 border rounded p-2 resize-none"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      style={{ fontFamily: 'inherit', fontSize: '1em' }}
                    />
                    <div className="text-xs text-gray-500 mt-1 mb-2">Type <span className="font-bold text-blue-600">@</span> to mention a collaborator</div>
                    <div className="w-full min-h-[1.5em] text-sm mb-2" style={{ background: '#f8fafc', borderRadius: 4, padding: 4 }}>
                      {renderMentionedText(commentText)}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleAddComment}>Add</button>
                      <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setShowCommentModal(false)}>Cancel</button>
                    </div>
                  </div>
                );
              })()
            )}
            {activeComment && (
              <div style={{ position: 'fixed', left: popupPos.x + 10, top: popupPos.y + 10, zIndex: 2000 }} className="bg-white border rounded shadow p-4 min-w-[250px]">
                <div className="mb-2 text-sm text-gray-700">{activeComment.text}</div>
                <div className="text-xs text-gray-400 mb-2">By {activeComment.authorEmail} • {activeComment.status}</div>
                {user && hasPermission === true && (
                  <div className="flex gap-2">
                     <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleDelete(activeComment)}>Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {showShareModal && (
          <ShareModal 
            docId={docId} 
            onClose={() => setShowShareModal(false)} 
            currentPermissions={{
              title: docData.title,
              owner: docData.owner,
              collaborators: docData.collaborators || [],
              anyoneCanAccess: docData.anyoneCanAccess || false,
              anyoneCanEdit: docData.anyoneCanEdit || false
            }}
          />
        )}
      </div>
    </div>
  );
}

EditorPane.propTypes = {
  docId: PropTypes.string,
};
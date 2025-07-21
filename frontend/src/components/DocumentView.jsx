import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

const DocumentView = () => {
  const { docId } = useParams();
  const [content, setContent] = useState(null);
  const [title, setTitle] = useState('');
  const [accessAllowed, setAccessAllowed] = useState(false);
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  useEffect(() => {
    const fetchDoc = async () => {
      const docRef = doc(db, 'documents', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || 'Untitled');
        if (data.anyoneCanAccess) {
          setAccessAllowed(true);
          setContent(data.content || '');
        } else {
          setAccessAllowed(false);
          setContent('');
        }
      } else {
        setAccessAllowed(false);
        setContent('');
      }
    };
    fetchDoc();
  }, [docId]);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user) {
        const docRef = doc(db, 'documents', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.owner === user.uid || (data.collaborators || []).some(c => c.email === user.email)) {
            navigate(`/editor/${docId}`);
          }
        }
      }
    };
    checkAndRedirect();
  }, [user, docId, navigate]);

  // Always initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ table: false, history: true }),
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: 'Start typing or type "/" for commands...',
      }),
    ],
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl !max-w-none p-6 min-h-[500px] focus:outline-none w-full pointer-events-none',
      },
    },
  });

  // Update content when loaded
  useEffect(() => {
    if (editor && content !== null) {
      editor.commands.setContent(content, false); // Parse as HTML
    }
  }, [editor, content]);

  if (!accessAllowed) {
    return (
      <div className="p-6 text-center text-red-600">
        You do not have permission to view this document.
      </div>
    );
  }

  if (content === null) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading document content...
      </div>
    );
  }

  return (
    <div className="w-full p-0">
      <h1 className="text-2xl font-bold mb-4 px-6">{title}</h1>
      <div className="border rounded bg-white shadow w-full">
        {editor && <EditorContent editor={editor} />}
      </div>
    </div>
  );
};

export default DocumentView;

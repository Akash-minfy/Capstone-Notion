import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

const ShareModal = ({ docId, onClose, currentPermissions }) => {
  const [user] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('can edit');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(currentPermissions?.anyoneCanAccess || false);
  const [isPublicEditable, setIsPublicEditable] = useState(currentPermissions?.anyoneCanEdit || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email || !docId || !user) {
      setMessage('Please enter a valid email');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email format');
      }

      const newCollaborator = {
        email,
        permission,
        invitedBy: user.email,
        invitedAt: new Date().toISOString()
      };

      // Build new collaborators array
      const updatedCollaborators = [
        ...(currentPermissions?.collaborators || []),
        newCollaborator
      ];
      // Build collaboratorEmails array
      const collaboratorEmails = updatedCollaborators
        .map(c => c.email)
        .filter(email => !!email);

      await updateDoc(doc(db, 'documents', docId), {
        collaborators: updatedCollaborators,
        collaboratorEmails: collaboratorEmails
      });

      await addDoc(collection(db, 'notifications'), {
        recipientEmail: email,
        senderEmail: user.email,
        docId,
        docTitle: currentPermissions.title || 'Untitled Document',
        permission,
        link: `${window.location.origin}/dashboard`,
        createdAt: serverTimestamp(),
        read: false
      });

      setMessage(`Invitation sent to ${email}`);
      setEmail('');
    } catch (err) {
      console.error('Sharing error:', err);
      setMessage(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublicAccessChange = async () => {
    try {
      const newPublicState = !isPublic;
      await updateDoc(doc(db, 'documents', docId), {
        anyoneCanAccess: newPublicState,
        // Reset edit permission if making private
        anyoneCanEdit: newPublicState ? isPublicEditable : false
      });
      setIsPublic(newPublicState);
      if (!newPublicState) setIsPublicEditable(false);
      setMessage(newPublicState ? 'Document is now publicly viewable' : 'Document is now private');
    } catch (err) {
      console.error('Public access error:', err);
      setMessage('Failed to update public access');
    }
  };

  const handlePublicEditChange = async () => {
    try {
      const newEditState = !isPublicEditable;
      await updateDoc(doc(db, 'documents', docId), {
        anyoneCanEdit: newEditState,
        // Ensure document is public if allowing edits
        anyoneCanAccess: newEditState ? true : isPublic
      });
      setIsPublicEditable(newEditState);
      if (newEditState) setIsPublic(true);
      setMessage(newEditState ? 'Document is now publicly editable' : 'Public edit disabled');
    } catch (err) {
      console.error('Public edit error:', err);
      setMessage('Failed to update edit permissions');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${window.location.origin}/doc/${docId}`);
    setMessage('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Share document</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleInvite} className="mb-6">
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="flex-1 border rounded px-3 py-2"
              required
              disabled={isSubmitting}
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={isSubmitting}
            >
              <option value="can edit">Can edit</option>
              <option value="can view">Can view</option>
            </select>
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isSubmitting || !email}
            >
              {isSubmitting ? 'Sending...' : 'Invite'}
            </button>
          </div>
        </form>

        <div className="mb-4">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={handlePublicAccessChange}
                className="h-4 w-4"
                disabled={isSubmitting}
              />
              <span>Anyone with the link can view</span>
            </label>
            
            {isPublic && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={isPublicEditable}
                  onChange={handlePublicEditChange}
                  className="h-4 w-4"
                  disabled={isSubmitting || !isPublic}
                />
                <span>Allow editing by anyone with the link</span>
              </label>
            )}
          </div>

          {isPublic && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/doc/${docId}`}
                  className="flex-1 border px-3 py-2 rounded text-sm bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isPublicEditable 
                  ? "Anyone with this link can view and edit the document"
                  : "Anyone with this link can view the document"}
              </p>
            </div>
          )}
        </div>

        {message && (
          <p className={`text-sm mb-4 p-2 rounded ${
            message.toLowerCase().includes('success') || 
            message.toLowerCase().includes('copied') ||
            message.toLowerCase().includes('now')
              ? 'text-green-700 bg-green-100' 
              : 'text-red-700 bg-red-100'
          }`}>
            {message}
          </p>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">People with access</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{user?.email}</span>
              <span className="text-sm text-gray-500">Owner</span>
            </div>
            {currentPermissions?.collaborators?.map((collab, index) => (
              <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span>{collab.email}</span>
                <span className="text-sm text-gray-500 capitalize">
                  {collab.permission}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
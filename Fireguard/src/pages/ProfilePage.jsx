import React, { useState, useEffect } from "react";
import { auth, firestore } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { FaUser, FaLock } from "react-icons/fa";
import { useToast } from "../context/ToastContext";
import ChangePasswordModal from "../components/ChangePasswordModal";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const { showToast } = useToast();

  // Load user data
  useEffect(() => {
    const getUser = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(
          doc(firestore, "users", auth.currentUser.uid),
        );
        if (userDoc.exists()) {
          setDisplayName(
            userDoc.data().displayName || auth.currentUser.displayName || "",
          );
        }
      }
    };
    getUser();
  }, []);

  // Handle update display name
  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      showToast("Name cannot be empty", "warning");
      return;
    }
    setLoadingName(true);
    try {
      // Update Firebase Auth
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      // Update Firestore
      if (auth.currentUser) {
        await updateDoc(doc(firestore, "users", auth.currentUser.uid), {
          displayName: displayName,
        });
      }
      setEditingName(false);
      showToast("Name updated successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast(`Failed to update name: ${err.message}`, "error");
    } finally {
      setLoadingName(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your account settings
          </p>
        </div>
      </div>

      {/* Account Information Section */}
      <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
          <FaUser className="text-blue-600" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={loadingName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loadingName ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-800 font-medium">
                  {displayName || "Not set"}
                </span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-gray-800">
              {auth.currentUser?.email}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your email cannot be changed
            </p>
          </div>
        </div>
      </div>

      {/* Account Security Section */}
      <div className="mb-8 bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <FaLock className="text-red-600" />
          Account Security
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Manage your account password and keep your account secure
        </p>
        <button
          onClick={() => setShowChangePasswordModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Change Password
        </button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => {
          // Optional: Show success message
        }}
      />
    </div>
  );
}

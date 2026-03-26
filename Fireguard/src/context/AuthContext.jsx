import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, firestore } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = window.reactRouterNavigate || null;

  useEffect(() => {
    let offRole = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setRole(null);
      setIsDeleted(false);
      if (!u) {
        setLoading(false);
        if (offRole) {
          offRole();
          offRole = null;
        }
        return;
      }

      // listen to users/{uid} doc in Firestore for role changes and deleted status
      const userDoc = doc(firestore, "users", u.uid);
      offRole = onSnapshot(
        userDoc,
        (snap) => {
          const data = snap.exists() ? snap.data() : {};
          setRole(data.role || "user");

          // Check if user is marked as deleted
          if (data.isDeleted) {
            setIsDeleted(true);
            // Auto sign out if user is deleted
            signOut(auth).catch((err) => console.error("Sign out error:", err));
          } else {
            setIsDeleted(false);
          }

          setLoading(false);
        },
        (err) => {
          console.error("Failed to read user role:", err);
          setRole("user");
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      if (offRole) offRole();
    };
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    if (navigate) {
      navigate("/login");
    } else {
      window.location.hash = "#/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isDeleted, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

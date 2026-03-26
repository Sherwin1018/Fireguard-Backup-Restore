import React, { useState } from "react";
import { auth, firestore } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import fireguardLogo from "../assets/fireguard-logo.png";
import bgAlpha from "../assets/bg-alpha.jpg";

// Initialize EmailJS
const EMAILJS_PUBLIC_KEY = "of9oEgeazNJq_sjCb";
const EMAILJS_SERVICE_ID = "service_dnalnvl";
const EMAILJS_TEMPLATE_ID = "template_iddo68t";

emailjs.init(EMAILJS_PUBLIC_KEY);

// Generate temporary password
function generateTemporaryPassword() {
  const length = 12;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!displayName.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      // Generate temporary password
      const newTempPassword = generateTemporaryPassword();

      // Create user with temporary password
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        newTempPassword,
      );
      const user = cred.user;

      // Update display name on auth profile
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user document in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        email: user.email || null,
        displayName: displayName || null,
        role: "user",
        createdAt: serverTimestamp(),
        needsPasswordChange: true,
        temporaryPasswordSet: true,
      });

      // Send temporary password via EmailJS
      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          user_email: email,
          user_name: displayName,
          temp_password: newTempPassword,
        });
        console.log("Email sent successfully!");
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail, user is created
      }

      // Show success message
      setShowSuccess(true);
      setDisplayName("");
      setEmail("");
    } catch (err) {
      console.error(err);

      let errorMessage = "";

      // Map Firebase error codes to user-friendly messages
      switch (err.code) {
        case "auth/email-already-in-use":
          errorMessage =
            "This email address is already registered. Please use a different email or try logging in.";
          break;
        case "auth/invalid-email":
          errorMessage =
            "Invalid email address format. Please check and try again.";
          break;
        case "auth/weak-password":
          errorMessage =
            "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
          break;
        case "auth/operation-not-allowed":
          errorMessage =
            "Email/password registration is not enabled. Please contact support.";
          break;
        default:
          errorMessage =
            err.message || "Registration failed. Please try again.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex w-[1000px] max-w-full h-[640px] rounded-3xl shadow-2xl overflow-hidden">
        {/* Left promotional panel */}
        <div
          className="w-1/2 text-white p-12 relative hidden md:flex flex-col justify-between"
          style={{
            backgroundImage: `linear-gradient(to bottom right, rgba(220, 38, 38, 0.8), rgba(185, 28, 28, 0.7)), url(${bgAlpha})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div>
            <h2 className="text-sm opacity-90">Join FireGuard Today</h2>
            <h1 className="text-3xl md:text-4xl font-semibold mt-6 max-w-md">
              Start monitoring your rooms in minutes.
            </h1>
            <p className="mt-4 text-sm max-w-lg opacity-90">
              Create an account and get instant access to real-time temperature
              and humidity monitoring.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium">Easy Setup</div>
                <div className="text-sm opacity-90">
                  Register in seconds and start monitoring right away
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2v6"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 12H4"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium">Secure Password</div>
                <div className="text-sm opacity-90">
                  Receive a temporary password via email for secure access
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3v18h18"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium">Real-time Monitoring</div>
                <div className="text-sm opacity-90">
                  Track your rooms' conditions 24/7 with instant alerts
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-1/2 bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="max-w-md w-full p-10">
            {!showSuccess ? (
              <>
                <div className="flex flex-col items-center">
                  <img
                    src={fireguardLogo}
                    alt="Fireguard"
                    className="w-50 h-50"
                  />
                  <h2 className="text-2xl font-semibold mb-2 text-gray-800">
                    Create Account
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Join FireGuard and start monitoring today
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      disabled={loading}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={loading}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 A temporary password will be sent to your email address
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      ❌ {error}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {loading ? "Creating Account..." : "Create Account"}
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        Login here
                      </button>
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-gray-800">
                  Account Created!
                </h2>
                <p className="text-gray-600">
                  Check your email for a temporary password to log in.
                </p>

                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

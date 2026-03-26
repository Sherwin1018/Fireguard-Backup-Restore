import React, { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { auth, firestore } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { doc, getDoc } from "firebase/firestore";
import fireguardLogo from "../assets/fireguard-logo.png";
import bgAlpha from "../assets/bg-alpha.jpg";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        username,
        password,
      );
      const user = userCredential.user;

      // Check if user is marked as deleted
      const userDoc = await getDoc(doc(firestore, "users", user.uid));

      if (userDoc.exists() && userDoc.data().isDeleted) {
        // User is deleted, sign them out
        await signOut(auth);
        setError("This account has been deleted and cannot be accessed.");
        showToast("Account deleted: This account has been removed.", "error");
        setLoading(false);
        return;
      }

      // Check if user needs to change password (temporary password setup)
      if (userDoc.exists() && userDoc.data().needsPasswordChange) {
        // Store temporary password in sessionStorage for the settings page
        sessionStorage.setItem("tempPassword", password);
        showToast(
          "Login successful! Redirecting to settings to set your password...",
          "success",
        );
        navigate("/settings");
      } else {
        showToast("Login successful!", "success");
        navigate("/"); // Redirect to dashboard
      }
    } catch (error) {
      let errorMessage = "";

      // Map Firebase error codes to user-friendly messages
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage =
            "User account does not exist. Please check your email or create a new account.";
          break;
        case "auth/wrong-password":
          errorMessage =
            "Incorrect password. Please try again or use 'Forgot password?'";
          break;
        case "auth/invalid-email":
          errorMessage =
            "Invalid email address format. Please check and try again.";
          break;
        case "auth/invalid-credential":
          errorMessage =
            "Invalid email or password. Please check and try again.";
          break;
        case "auth/user-disabled":
          errorMessage =
            "This account has been disabled. Please contact support.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many login attempts. Please try again later.";
          break;
        default:
          errorMessage = error.message || "Login failed. Please try again.";
      }

      setError(errorMessage);
      showToast(`Login failed: ${errorMessage}`, "error");
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
            <h2 className="text-sm opacity-90">
              Monitor Your Rooms with Confidence
            </h2>
            <h1 className="text-3xl md:text-4xl font-semibold mt-6 max-w-md">
              Real-time temperature and humidity monitoring for all your spaces.
            </h1>
            <p className="mt-4 text-sm max-w-lg opacity-90">
              Get instant alerts and maintain optimal conditions effortlessly.
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
                <div className="font-medium">Real-time Monitoring</div>
                <div className="text-sm opacity-90">
                  Track temperature and humidity levels across all your rooms
                  instantly
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
                <div className="font-medium">Smart Alerts</div>
                <div className="text-sm opacity-90">
                  Receive notifications when conditions fall outside your set
                  parameters
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
                <div className="font-medium">Analytics Dashboard</div>
                <div className="text-sm opacity-90">
                  View historical data and trends to optimize your environment
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-1/2 bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="max-w-md w-full p-10">
            <div className="flex flex-col items-center">
              <img src={fireguardLogo} alt="Fireguard" className="w-50 h-50" />
              <h2 className="text-2xl font-semibold mb-2 text-gray-800">
                Login to Fireguard
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Start monitoring your rooms today
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-sm text-gray-700 font-medium">
                Email Address
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              <label className="block text-sm text-gray-700 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible size={20} />
                  ) : (
                    <AiOutlineEye size={20} />
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  ❌ {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

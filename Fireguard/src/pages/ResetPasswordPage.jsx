import React, { useState, useEffect } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { auth } from "../firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import fireguardLogo from "../assets/fireguard-logo.png";
import bgAlpha from "../assets/bg-alpha.jpg";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validatingCode, setValidatingCode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode");

  // Verify the reset code when component mounts
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setError("Invalid reset link. No reset code provided.");
        setValidatingCode(false);
        return;
      }

      try {
        // Verify the code is valid
        await verifyPasswordResetCode(auth, oobCode);
        setValidatingCode(false);
      } catch (err) {
        console.error("Invalid reset code:", err);
        if (err.code === "auth/expired-action-code") {
          setError("Reset link has expired. Please request a new one.");
        } else if (err.code === "auth/invalid-action-code") {
          setError("Invalid reset link. Please request a new one.");
        } else {
          setError("Invalid reset link. Please try again.");
        }
        setValidatingCode(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please enter and confirm your password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      // Confirm the password reset
      await confirmPasswordReset(auth, oobCode, password);
      console.log("Password reset successfully!");
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error("Error resetting password:", err);

      let errorMessage = "";

      // Map Firebase error codes to user-friendly messages
      switch (err.code) {
        case "auth/expired-action-code":
          errorMessage =
            "This password reset link has expired. Please request a new one.";
          break;
        case "auth/invalid-action-code":
          errorMessage =
            "This password reset link is invalid. Please request a new one.";
          break;
        case "auth/weak-password":
          errorMessage =
            "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
          break;
        case "auth/user-disabled":
          errorMessage =
            "This account has been disabled. Please contact support.";
          break;
        default:
          errorMessage =
            err.message || "Failed to reset password. Please try again.";
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
            <h2 className="text-sm opacity-90">Secure Your Account</h2>
            <h1 className="text-3xl md:text-4xl font-semibold mt-6 max-w-md">
              Create a new password to regain access
            </h1>
            <p className="mt-4 text-sm max-w-lg opacity-90">
              Make sure to use a strong password with a mix of letters, numbers,
              and special characters.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔐</div>
              <div>
                <h3 className="font-semibold">Strong Security</h3>
                <p className="text-sm opacity-90">
                  Your new password will be encrypted and securely stored.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚡</div>
              <div>
                <h3 className="font-semibold">Instant Access</h3>
                <p className="text-sm opacity-90">
                  Log in immediately with your new password after reset.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-2xl">✓</div>
              <div>
                <h3 className="font-semibold">Peace of Mind</h3>
                <p className="text-sm opacity-90">
                  Monitor your account activity and manage security settings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8">
          <img src={fireguardLogo} alt="Fireguard Logo" className="w-24 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create New Password
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Enter a new password to secure your FireGuard account
          </p>

          {verifying ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
              <p className="text-gray-600 mt-4 text-sm">
                Verifying reset link...
              </p>
            </div>
          ) : validatingCode ? (
            <div className="text-center py-12">
              <div className="text-red-600 text-4xl mb-4">❌</div>
              <p className="text-gray-900 font-semibold mb-2">
                Invalid or Expired Link
              </p>
              <p className="text-gray-600 text-sm mb-6">{error}</p>
              <button
                onClick={() => navigate("/forgot-password")}
                className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Request New Reset Link
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-12">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <p className="text-gray-900 font-semibold mb-2">
                Password Reset Successfully!
              </p>
              <p className="text-gray-600 text-sm mb-6">
                Redirecting you to login...
              </p>
              <div className="animate-pulse text-red-600">
                <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-800 rounded-full"></div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    required
                    disabled={loading}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {showConfirmPassword ? (
                      <AiOutlineEyeInvisible size={20} />
                    ) : (
                      <AiOutlineEye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  ❌ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

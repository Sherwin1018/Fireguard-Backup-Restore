const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure your email service here
// For Gmail, use App Passwords: https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "your-email@gmail.com",
    pass: process.env.GMAIL_PASS || "your-app-password",
  },
});

// Function to send temporary password email
exports.sendTemporaryPassword = functions.https.onCall(
  async (data, context) => {
    const { email, displayName, tempPassword } = data;

    if (!email || !tempPassword) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and temporary password are required",
      );
    }

    try {
      const mailOptions = {
        from: process.env.GMAIL_USER || "your-email@gmail.com",
        to: email,
        subject: "Welcome to FireGuard - Temporary Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Welcome to FireGuard!</h2>
            <p>Dear ${displayName || "User"},</p>
            <p>Your account has been successfully created. Use the temporary password below to log in for the first time:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">Temporary Password:</p>
              <p style="margin: 10px 0; font-size: 24px; font-weight: bold; font-family: monospace; color: #dc2626;">
                ${tempPassword}
              </p>
            </div>
            
            <p style="color: #ef4444; font-weight: bold;">⚠️ Important:</p>
            <ul>
              <li>This is a temporary password. You must change it after your first login.</li>
              <li>Do not share this password with anyone.</li>
              <li>This password will expire after 24 hours if not used.</li>
            </ul>
            
            <p><strong>Email:</strong> ${email}</p>
            
            <p style="margin-top: 30px;">
              <a href="http://localhost:5173/login" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Log In to FireGuard
              </a>
            </p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              If you did not create this account, please contact support immediately.
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error sending email: " + error.message,
      );
    }
  },
);

// Function to check if user has changed password (on first login)
exports.checkPasswordChanged = functions.auth.user().onCreate(async (user) => {
  // Mark user as needing password change
  try {
    await admin.firestore().collection("users").doc(user.uid).update({
      needsPasswordChange: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user document:", error);
  }
});

// Function to reset password by email - generates temp password and updates Firebase Auth
exports.resetPasswordByEmail = functions.https.onCall(async (data, context) => {
  const { email, tempPassword } = data;

  if (!email || !tempPassword) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email and temporary password are required",
    );
  }

  try {
    console.log(`Password reset requested for: ${email}`);

    // Step 1: Find user by email
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`User found: ${user.uid}`);
    } catch (error) {
      console.error("User lookup failed:", error.code, error.message);
      throw new functions.https.HttpsError(
        "not-found",
        "No user found with this email address",
      );
    }

    // Step 2: Update the user's password in Firebase Auth
    try {
      await admin.auth().updateUser(user.uid, {
        password: tempPassword,
      });
      console.log(`Password updated successfully for user: ${user.uid}`);
    } catch (error) {
      console.error("Password update failed:", error.code, error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update password: " + error.message,
      );
    }

    // Step 3: Mark user as needing password change in Firestore (non-critical)
    try {
      await admin.firestore().collection("users").doc(user.uid).update({
        needsPasswordChange: true,
        temporaryPasswordSet: true,
      });
      console.log(`Firestore updated for user: ${user.uid}`);
    } catch (err) {
      // Log but don't fail - Firestore update is secondary
      console.warn("Firestore update warning:", err.message);
    }

    // Step 4: Send reset email (non-critical - password is already reset)
    try {
      const mailOptions = {
        from: process.env.GMAIL_USER || "noreply@fireguard.com",
        to: email,
        subject: "FireGuard - Password Reset",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Password Reset</h2>
              <p>Dear User,</p>
              <p>Your password has been reset. Use the temporary password below to log in:</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Temporary Password:</p>
                <p style="margin: 10px 0; font-size: 24px; font-weight: bold; font-family: monospace; color: #dc2626;">
                  ${tempPassword}
                </p>
              </div>
              
              <p style="color: #ef4444; font-weight: bold;">⚠️ Important:</p>
              <ul>
                <li>This is a temporary password. You must change it after logging in.</li>
                <li>Do not share this password with anyone.</li>
                <li>This password will expire after 24 hours if not used.</li>
              </ul>
              
              <p><strong>Email:</strong> ${email}</p>
              
              <p style="margin-top: 30px;">
                <a href="http://localhost:5173/login" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Log In to FireGuard
                </a>
              </p>
              
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #6b7280;">
                If you did not request this password reset, please contact support immediately.
              </p>
            </div>
          `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to: ${email}`);
    } catch (emailError) {
      // Log email error but don't fail the function
      // Password reset is already successful
      console.warn("Email sending failed (non-critical):", emailError.message);
    }

    // Return success - password is already reset
    return {
      success: true,
      message:
        "Password has been reset. Check your email for the temporary password.",
    };
  } catch (error) {
    console.error("Password reset function error:", error);
    // Re-throw HttpsError if already formatted
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Generic error fallback
    throw new functions.https.HttpsError(
      "internal",
      "Failed to reset password. Please try again or contact support.",
    );
  }
});

// Function to delete user from both Firebase Auth and Firestore
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User ID (uid) is required",
    );
  }

  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated admins can delete users",
    );
  }

  try {
    console.log(`User deletion requested for UID: ${uid}`);

    // Step 1: Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(uid);
      console.log(`User deleted from Firebase Auth: ${uid}`);
    } catch (error) {
      console.error("Auth deletion failed:", error.code, error.message);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to delete user from authentication: " + error.message,
      );
    }

    // Step 2: Delete from Firestore
    try {
      await admin.firestore().collection("users").doc(uid).delete();
      console.log(`User deleted from Firestore: ${uid}`);
    } catch (error) {
      console.error("Firestore deletion failed:", error.code, error.message);
      throw new functions.https.HttpsError(
        "internal",
        "User deleted from auth but failed to remove from database: " +
          error.message,
      );
    }

    return {
      success: true,
      message: "User successfully deleted from authentication and database",
    };
  } catch (error) {
    console.error("User deletion function error:", error);
    // Re-throw HttpsError if already formatted
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // Generic error fallback
    throw new functions.https.HttpsError(
      "internal",
      "Failed to delete user. Please try again or contact support.",
    );
  }
});

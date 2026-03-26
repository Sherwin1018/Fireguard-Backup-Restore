# EmailJS Setup for Temporary Password Emails

This guide shows how to set up **free email sending** using EmailJS (200 free emails/month).

## **Step 1: Install EmailJS**

```bash
npm install @emailjs/browser
```

## **Step 2: Create Free EmailJS Account**

1. Go to https://www.emailjs.com
2. Click **Sign Up** (free account)
3. Verify your email
4. Go to **Dashboard**

## **Step 3: Add Email Service**

1. In Dashboard → **Email Services** → **Add New Service**
2. Choose one of:
   - **Gmail** (recommended)
   - **Outlook**
   - **SendGrid**
   - **Other**

### For Gmail:

1. Select Gmail
2. Click "Connect Gmail Account"
3. Authorize EmailJS to use your Gmail
4. Note your **Service ID** (looks like: `service_xxxxx`)

## **Step 4: Create Email Template**

1. Go to **Email Templates** → **Create New Template**
2. Name it: `temporary_password_template`
3. Configure:

**Subject:**

```
Welcome to FireGuard - Your Temporary Password
```

**Email Content (HTML):**

```html
<h2>Welcome to FireGuard!</h2>

<p>Dear {{user_name}},</p>

<p>Your FireGuard account has been successfully created!</p>

<p>Use the temporary password below to log in:</p>

<div
  style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0;"
>
  <code style="font-size: 18px; font-weight: bold; color: #dc2626;"
    >{{temp_password}}</code
  >
</div>

<p><strong>⚠️ IMPORTANT:</strong></p>
<ul>
  <li>This is your temporary password</li>
  <li>You must change it after your first login</li>
  <li>Do not share this password with anyone</li>
</ul>

<p>
  <a
    href="http://localhost:5173/login"
    style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;"
    >Log In to FireGuard</a
  >
</p>

<p>Best regards,<br />FireGuard Team</p>
```

4. Save Template
5. Note the **Template ID** (looks like: `template_xxxxx`)

## **Step 5: Get Your Public Key**

1. Go to **Account** → **API Keys**
2. Copy your **Public Key**

## **Step 6: Update RegisterPage.jsx**

Replace these values in `src/pages/RegisterPage.jsx` (lines 8-10):

```jsx
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY_HERE";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID_HERE";
const EMAILJS_TEMPLATE_ID = "temporary_password_template";
```

**Example:**

```jsx
const EMAILJS_PUBLIC_KEY = "abc123xyz456";
const EMAILJS_SERVICE_ID = "service_abc123xyz";
const EMAILJS_TEMPLATE_ID = "temporary_password_template";
```

## **Step 7: Test It**

1. Run your app:

   ```bash
   npm run dev
   ```

2. Go to Register page
3. Create an account
4. Check the email inbox for the temporary password
5. Use it to log in

## **EmailJS Pricing**

| Plan        | Price       | Emails/Month | Features            |
| ----------- | ----------- | ------------ | ------------------- |
| **Free**    | $0          | 200          | Perfect for testing |
| **Starter** | $0-10/month | 1,000+       | Pay as you go       |

## **Limits & Tips**

- ✅ **200 free emails/month** - great for small projects
- ✅ **1 service + 1 template** - enough for this feature
- ✅ **No credit card** - truly free
- ⚠️ If you exceed 200/month, it costs ~$0.05 per email

## **Troubleshooting**

### Email not sending?

1. Check browser console for errors
2. Verify API keys are correct (no extra spaces)
3. Make sure template ID matches exactly
4. Check EmailJS dashboard for failed requests

### Wrong email format?

Go to **Email Templates** → Edit template

- Check the variable names match: `{{user_email}}`, `{{user_name}}`, `{{temp_password}}`

### Want to use your own email?

Instead of Gmail, you can:

- Use **SMTP** (your hosting provider's email)
- Use **SendGrid** (free tier: 100/day)
- Use **Brevo** (formerly Sendinblue - 300/day free)

## **Next Steps**

After confirming emails are working:

1. Update the login URL in template (change `localhost:5173` to your production URL)
2. Add more customization to the email template
3. Monitor EmailJS dashboard for usage

---

**Questions?** Check EmailJS docs: https://www.emailjs.com/docs/

# Gmail SMTP Configuration Guide

## Issue
Email sending is failing with error: "Lỗi gửi email. Vui lòng thử lại" (Email sending error. Please try again)

## Common Causes and Solutions

### 1. ✅ Generate Gmail App Password (MOST COMMON ISSUE)

Gmail requires an **App Password** (not your regular password) when 2-factor authentication is enabled.

**Steps:**
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Enable **2-Step Verification** if not already enabled
4. Under "App passwords", select:
   - Device: **Windows Computer** (or your device)
   - App: **Mail**
5. Click **Generate**
6. Copy the 16-character password
7. Update `.env`:
   ```
   GMAIL_APP_PASSWORD=<paste_16_character_password_here_without_spaces>
   ```

### 2. ✅ Verify Gmail Account Settings

Check that your Gmail account is properly configured:

```bash
# This will test the connection when the server starts
# Check the server logs for connection verification message
```

Expected log output:
```
✅ Gmail connection verified successfully
```

If you see an error, check:
- GMAIL_USER is spelled correctly (case-sensitive: hiresmart2525@gmail.com)
- GMAIL_APP_PASSWORD is exactly 16 characters
- No extra spaces before/after credentials in .env

### 3. ✅ Update Environment Variables

After generating app password, restart the server:

```bash
# Stop current server
npm stop

# Or in development
Ctrl+C  # Stop the dev server

# Restart
npm run start:dev
```

### 4. ✅ Verify Credentials in .env

```env
# Correct format
GMAIL_USER=hiresmart2525@gmail.com
GMAIL_APP_PASSWORD=hziqvwfwzlijkvnf

# ❌ WRONG - Don't use quotes
GMAIL_USER="hiresmart2525@gmail.com"
GMAIL_APP_PASSWORD="hziqvwfwzlijkvnf"

# ❌ WRONG - Don't use spaces
GMAIL_USER = hiresmart2525@gmail.com
```

## Troubleshooting

### Check Server Logs

When server starts, look for these messages:

**✅ Success:**
```
✅ Gmail connection verified successfully
```

**❌ Error - Invalid Credentials:**
```
❌ Failed to verify Gmail connection: Invalid login credentials
Please check your Gmail credentials and ensure:
1. GMAIL_USER is correct
2. GMAIL_APP_PASSWORD is set (not regular password)
3. 2-factor authentication is enabled
4. App passwords are enabled in Google Account
```

**❌ Error - Missing Credentials:**
```
❌ Missing Gmail credentials in .env file
GMAIL_USER: ✗ Not set
GMAIL_APP_PASSWORD: ✗ Not set
```

### Network Issues

If you see connection errors:
- Check your internet connection
- Verify Gmail SMTP is not blocked by firewall
- Try from different network (corporate networks may block SMTP)

## Test Email Sending

Once configured correctly, the `/api/v1/auth/pre-register` endpoint should work:

```bash
curl -X POST http://localhost:3000/api/v1/auth/pre-register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser"
  }'
```

Expected success response:
```json
{
  "success": true,
  "message": "Mã OTP xác thực đã gửi tới test@example.com. Có hiệu lực 5 phút"
}
```

## Gmail Security Settings

For account: `hiresmart2525@gmail.com`

**Required Settings:**
1. ✅ 2-Step Verification: **Enabled**
2. ✅ App Passwords: **Generated**
3. ✅ Less Secure App Access: **Not needed** (with app password)

**Check Status:**
- Visit: [Google Account Security](https://myaccount.google.com/security)
- You should see "App passwords" option (only visible if 2-Step is enabled)

## Alternative: Use Gmail Regular Password

If you don't want to use app password, you can enable "Less secure app access":

⚠️ **NOT RECOMMENDED for production** - Less secure

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Search for "Less secure app access"
3. Enable it
4. Use your regular Gmail password in `.env`

## Testing Locally

If email isn't working locally:

1. Verify `.env` file exists in project root
2. Verify credentials are correct in `.env`
3. Check server logs when starting
4. Check network connection
5. Restart server after changing `.env`

## Production Deployment

For production on Render:

1. Add environment variables in Render dashboard:
   - `GMAIL_USER=hiresmart2525@gmail.com`
   - `GMAIL_APP_PASSWORD=<your_16_character_app_password>`

2. Redeploy the application

3. Check logs for connection verification message

## Support

If email still doesn't work:

1. Check complete server logs for error details
2. Verify GMAIL_APP_PASSWORD has exactly 16 characters (no spaces)
3. Wait 5 minutes after generating app password for Gmail to sync
4. Try regenerating app password

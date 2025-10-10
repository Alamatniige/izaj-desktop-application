interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface ResetPasswordEmailData {
  resetUrl: string;
  userName?: string;
  expiryHours: number;
}

export function getResetPasswordEmail(data: ResetPasswordEmailData): EmailTemplate {
  const { resetUrl, userName = 'User', expiryHours = 24 } = data;
  
  const subject = 'Reset Your IZAJ Password';
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - IZAJ</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 24px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .reset-button {
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .reset-button:hover {
          background-color: #1d4ed8;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 5px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .support {
          margin-top: 20px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">IZAJ</div>
          <h1 class="title">Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          
          <p>We received a request to reset your password for your IZAJ account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">Reset My Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important Security Information:</strong>
            <ul>
              <li>This link will expire in ${expiryHours} hours</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
              <li>IZAJ will never ask for your password via email</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace;">
            ${resetUrl}
          </p>
        </div>
        
        <div class="support">
          <h3>Need Help?</h3>
          <p>If you're having trouble accessing your account or have questions, please contact our support team:</p>
          <ul>
            <li>Email: support@izaj.com</li>
            <li>Phone: +63 XXX XXX XXXX</li>
            <li>Available: Monday - Friday, 9 AM - 6 PM (PHT)</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>This email was sent from IZAJ. If you didn't request this password reset, you can safely ignore this email.</p>
          <p>© 2024 IZAJ. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Password Reset Request - IZAJ
    
    Hello ${userName},
    
    We received a request to reset your password for your IZAJ account. If you made this request, visit the link below to reset your password:
    
    ${resetUrl}
    
    Important Security Information:
    - This link will expire in ${expiryHours} hours
    - If you didn't request this password reset, please ignore this email
    - Never share this link with anyone
    - IZAJ will never ask for your password via email
    
    Need Help?
    If you're having trouble accessing your account or have questions, please contact our support team:
    - Email: support@izaj.com
    - Phone: +63 XXX XXX XXXX
    - Available: Monday - Friday, 9 AM - 6 PM (PHT)
    
    This email was sent from IZAJ. If you didn't request this password reset, you can safely ignore this email.
    
    © 2024 IZAJ. All rights reserved.
    This is an automated message. Please do not reply to this email.
  `;
  
  return { subject, html, text };
}

export function getPasswordResetSuccessEmail(userName: string = 'User'): EmailTemplate {
  const subject = 'Password Successfully Reset - IZAJ';
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful - IZAJ</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .success-icon {
          font-size: 48px;
          color: #10b981;
          margin-bottom: 10px;
        }
        .content {
          margin-bottom: 30px;
        }
        .security-tips {
          background-color: #ecfdf5;
          border: 1px solid #10b981;
          border-radius: 5px;
          padding: 15px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">IZAJ</div>
          <div class="success-icon">✅</div>
          <h1>Password Successfully Reset</h1>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          
          <p>Your password has been successfully reset. You can now log in to your IZAJ account with your new password.</p>
          
          <div class="security-tips">
            <h3>🔒 Security Tips:</h3>
            <ul>
              <li>Use a strong, unique password</li>
              <li>Never share your password with anyone</li>
              <li>Log out from shared or public computers</li>
              <li>Enable two-factor authentication if available</li>
              <li>Regularly update your password</li>
            </ul>
          </div>
          
          <p>If you didn't make this change or suspect unauthorized access to your account, please contact our support team immediately.</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing IZAJ!</p>
          <p>© 2024 IZAJ. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Password Successfully Reset - IZAJ
    
    Hello ${userName},
    
    Your password has been successfully reset. You can now log in to your IZAJ account with your new password.
    
    Security Tips:
    - Use a strong, unique password
    - Never share your password with anyone
    - Log out from shared or public computers
    - Enable two-factor authentication if available
    - Regularly update your password
    
    If you didn't make this change or suspect unauthorized access to your account, please contact our support team immediately.
    
    Thank you for choosing IZAJ!
    
    © 2024 IZAJ. All rights reserved.
  `;
  
  return { subject, html, text };
}

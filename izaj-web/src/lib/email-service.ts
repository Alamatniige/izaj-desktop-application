import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_USER || '',
        pass: process.env.GMAIL_APP_PASSWORD || '',
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"IZAJ Trading" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendConfirmationEmail(email: string, confirmationToken: string, userName: string): Promise<void> {
    const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm-email?token=${confirmationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Confirmation - IZAJ Lighting Centre</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .greeting {
            font-family: 'Avenir Next', sans-serif;
            font-size: 24px;
            font-weight: 600;
            color: #000000;
            margin-bottom: 20px;
          }
          
          .content p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #333333;
            line-height: 1.6;
          }
          
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          
          .button {
            display: inline-block;
            background: #000000;
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            border: 2px solid #000000;
          }
          
          .button:hover {
            background: #ffffff;
            color: #000000;
            border: 2px solid #000000;
          }
          
          .link-container {
            background: #f8f8f8;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .link-container p {
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
            font-weight: 500;
          }
          
          .link-url {
            word-break: break-all;
            background: #ffffff;
            padding: 12px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #333333;
            border: 1px solid #e5e5e5;
          }
          
          .warning {
            background: #f8f8f8;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .warning p {
            color: #333333;
            font-weight: 500;
            margin: 0;
          }
          
          .features {
            background: #f8f8f8;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
          }
          
          .features h3 {
            color: #000000;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
            font-family: 'Avenir Next', sans-serif;
          }
          
          .features ul {
            list-style: none;
            padding: 0;
          }
          
          .features li {
            padding: 8px 0;
            color: #333333;
            position: relative;
            padding-left: 25px;
          }
          
          .features li::before {
            content: '💡';
            position: absolute;
            left: 0;
            top: 8px;
          }
          
          .footer {
            background: #f8f8f8;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
          }
          
          .footer p {
            font-size: 14px;
            color: #666666;
            margin: 5px 0;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #6c757d;
            text-decoration: none;
            font-size: 14px;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              border-radius: 12px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .greeting {
              font-size: 20px;
            }
            
            .button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>IZAJ Lighting Centre</h1>
            <p>Email Confirmation</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hello ${userName}! 👋</h2>
            
            <p>Thank you for creating an account with <strong>IZAJ Lighting Centre</strong>! We're excited to have you join our community of lighting enthusiasts.</p>
            
            <p>To complete your registration and start exploring our premium lighting collection, please confirm your email address by clicking the button below:</p>
            
            <div class="button-container">
              <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
            </div>
            
            <div class="link-container">
              <p>If the button doesn't work, copy and paste this link:</p>
              <div class="link-url">${confirmationUrl}</div>
            </div>
            
            <div class="warning">
              <p><strong>⏰ Important:</strong> This confirmation link will expire in 24 hours for security reasons.</p>
            </div>
            
            <div class="features">
              <h3>What's next after confirmation?</h3>
              <ul>
                <li>Browse our exclusive lighting collection</li>
                <li>Create your personalized wishlist</li>
                <li>Enjoy fast and secure checkout</li>
                <li>Track your orders in real-time</li>
                <li>Get exclusive member discounts</li>
              </ul>
            </div>
            
            <p>If you didn't create an account with IZAJ Lighting Centre, please ignore this email.</p>
            
            <p>Welcome to the IZAJ family! We can't wait to help you illuminate your space. 🌟</p>
            
            <p>Best regards,<br><strong>The IZAJ Lighting Centre Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 IZAJ Lighting Centre. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Website</a> • 
              <a href="#">Support</a> • 
              <a href="#">Privacy Policy</a>
            </div>
            <p>For support, contact us at <strong>izajtrading@gmail.com</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${userName}!
      
      Thank you for creating an account with IZAJ Lighting Centre. To complete your registration, please confirm your email address by visiting this link:
      
      ${confirmationUrl}
      
      This link will expire in 24 hours for security reasons.
      
      If you didn't create an account with IZAJ Lighting Centre, please ignore this email.
      
      Welcome to the IZAJ family!
      
      Best regards,
      The IZAJ Lighting Centre Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Confirm Your Email - IZAJ Lighting Centre',
      html,
      text,
    });
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to IZAJ Lighting Centre</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
          }
          
          .success-badge {
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            display: inline-block;
            margin: 20px auto;
            text-align: center;
            width: 100%;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
          }
          
          .content p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #5a6c7d;
          }
          
          .features {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
          }
          
          .features h3 {
            color: #2c3e50;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
            text-align: center;
          }
          
          .features ul {
            list-style: none;
            padding: 0;
          }
          
          .features li {
            padding: 12px 0;
            color: #5a6c7d;
            position: relative;
            padding-left: 30px;
            font-size: 15px;
          }
          
          .features li::before {
            content: '💡';
            position: absolute;
            left: 0;
            top: 12px;
            font-size: 16px;
          }
          
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(102, 126, 234, 0.4);
          }
          
          .celebration {
            background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
          }
          
          .celebration h3 {
            color: #2c3e50;
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          .celebration p {
            color: #5a6c7d;
            font-size: 15px;
            margin: 0;
          }
          
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .footer p {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #6c757d;
            text-decoration: none;
            font-size: 14px;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              border-radius: 12px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .greeting {
              font-size: 20px;
            }
            
            .button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>IZAJ Lighting Centre</h1>
            <p>Welcome to Our Family!</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Welcome ${userName}! 🎉</h2>
            
            <div class="success-badge">
              ✅ Email Successfully Confirmed!
            </div>
            
            <p>Congratulations! Your email has been successfully confirmed and you're now officially a member of the <strong>IZAJ Lighting Centre</strong> family.</p>
            
            <div class="celebration">
              <h3>🌟 You're All Set!</h3>
              <p>Get ready to discover amazing lighting solutions that will transform your space.</p>
            </div>
            
            <div class="features">
              <h3>What you can do now:</h3>
              <ul>
                <li>Browse our exclusive premium lighting collection</li>
                <li>Create and manage your personalized wishlist</li>
                <li>Enjoy fast, secure, and hassle-free checkout</li>
                <li>Track your orders in real-time</li>
                <li>Access exclusive member-only discounts</li>
                <li>Get priority customer support</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/products" class="button">Start Shopping Now</a>
            </div>
            
            <p>Thank you for choosing <strong>IZAJ Lighting Centre</strong> for your lighting needs. We're committed to providing you with the best products and service experience.</p>
            
            <p>If you have any questions or need assistance, don't hesitate to reach out to our friendly support team.</p>
            
            <p>Welcome to the IZAJ family! Let's illuminate your world together. ✨</p>
            
            <p>Best regards,<br><strong>The IZAJ Lighting Centre Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 IZAJ Lighting Centre. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Website</a> • 
              <a href="#">Support</a> • 
              <a href="#">Privacy Policy</a>
            </div>
            <p>For support, contact us at <strong>izajtrading@gmail.com</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to IZAJ Lighting Centre!',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - IZAJ Lighting Centre</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          
          .content p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #5a6c7d;
          }
          
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 8px 20px rgba(231, 76, 60, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(231, 76, 60, 0.4);
          }
          
          .link-container {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .link-container p {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 10px;
            font-weight: 500;
          }
          
          .link-url {
            word-break: break-all;
            background: #ffffff;
            padding: 12px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #495057;
            border: 1px solid #e9ecef;
          }
          
          .warning {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .warning p {
            color: #721c24;
            font-weight: 500;
            margin: 0;
          }
          
          .security-tips {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
          }
          
          .security-tips h3 {
            color: #0c5460;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
          }
          
          .security-tips ul {
            list-style: none;
            padding: 0;
          }
          
          .security-tips li {
            padding: 8px 0;
            color: #0c5460;
            position: relative;
            padding-left: 25px;
          }
          
          .security-tips li::before {
            content: '🔒';
            position: absolute;
            left: 0;
            top: 8px;
          }
          
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .footer p {
            font-size: 14px;
            color: #6c757d;
            margin: 5px 0;
          }
          
          .social-links {
            margin: 20px 0;
          }
          
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #6c757d;
            text-decoration: none;
            font-size: 14px;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              border-radius: 12px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .greeting {
              font-size: 20px;
            }
            
            .button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>IZAJ Lighting Centre</h1>
            <p>Password Reset Request</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hello ${userName}! 🔐</h2>
            
            <p>We received a request to reset your password for your <strong>IZAJ Lighting Centre</strong> account. If you made this request, click the button below to create a new password:</p>
            
            <div class="button-container">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            
            <div class="link-container">
              <p>If the button doesn't work, copy and paste this link:</p>
              <div class="link-url">${resetUrl}</div>
            </div>
            
            <div class="warning">
              <p><strong>⏰ Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
            </div>
            
            <div class="security-tips">
              <h3>Security Tips:</h3>
              <ul>
                <li>Use a strong, unique password</li>
                <li>Include uppercase and lowercase letters</li>
                <li>Add numbers and special characters</li>
                <li>Don't reuse passwords from other accounts</li>
                <li>Consider using a password manager</li>
              </ul>
            </div>
            
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For your security, we recommend changing your password regularly and enabling two-factor authentication if available.</p>
            
            <p>If you have any concerns about your account security, please contact our support team immediately.</p>
            
            <p>Best regards,<br><strong>The IZAJ Lighting Centre Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 IZAJ Lighting Centre. All rights reserved.</p>
            <div class="social-links">
              <a href="#">Website</a> • 
              <a href="#">Support</a> • 
              <a href="#">Privacy Policy</a>
            </div>
            <p>For support, contact us at <strong>izajtrading@gmail.com</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${userName}!
      
      We received a request to reset your password for your IZAJ Lighting Centre account. If you made this request, please visit this link to create a new password:
      
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      
      For your security, we recommend changing your password regularly and using a strong, unique password.
      
      If you have any concerns about your account security, please contact our support team immediately.
      
      Best regards,
      The IZAJ Lighting Centre Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request - IZAJ Lighting Centre',
      html,
      text,
    });
  }

  async sendAccountDeletionEmail(email: string, deletionToken: string, userName: string): Promise<void> {
    const deletionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/confirm-deletion?token=${deletionToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deletion Confirmation - IZAJ Lighting Centre</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #000000;
            background: #ffffff;
            padding: 20px;
            min-height: 100vh;
            margin: 0;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e5e5;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .header {
            background: #000000;
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
          }
          
          .header h1 {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            font-weight: 400;
            margin-bottom: 8px;
            letter-spacing: 4px;
            text-shadow: -2px 0px 2px rgba(0, 0, 0, 0.5);
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          
          .content p {
            margin-bottom: 20px;
            font-size: 16px;
            color: #5a6c7d;
          }
          
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 8px 20px rgba(231, 76, 60, 0.3);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
          }
          
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 25px rgba(231, 76, 60, 0.4);
          }
          
          .link-container {
            background: #f8f8f8;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .link-container p {
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
            font-weight: 500;
          }
          
          .link-url {
            word-break: break-all;
            background: #ffffff;
            padding: 12px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #333333;
            border: 1px solid #e5e5e5;
          }
          
          .warning {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
          }
          
          .warning p {
            color: #dc2626;
            font-weight: 500;
            margin: 0;
          }
          
          .data-loss {
            background: #fffbeb;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
          }
          
          .data-loss h3 {
            color: #ea580c;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
            font-family: 'Avenir Next', sans-serif;
          }
          
          .data-loss ul {
            list-style: none;
            padding: 0;
          }
          
          .data-loss li {
            padding: 8px 0;
            color: #ea580c;
            position: relative;
            padding-left: 25px;
          }
          
          .data-loss li::before {
            content: '⚠️';
            position: absolute;
            left: 0;
            top: 8px;
          }
          
          .footer {
            background: #f8f8f8;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e5e5;
          }
          
          .footer p {
            font-size: 14px;
            color: #666666;
            margin: 5px 0;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .email-container {
              border-radius: 12px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
            
            .greeting {
              font-size: 20px;
            }
            
            .button {
              padding: 14px 30px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>IZAJ Lighting Centre</h1>
            <p>Account Deletion Request</p>
          </div>
          
          <div class="content">
            <h2 class="greeting">Hello ${userName},</h2>
            
            <p>We received a request to permanently delete your <strong>IZAJ Lighting Centre</strong> account. We're sorry to see you go!</p>
            
            <p>If you wish to proceed with deleting your account, please click the button below to confirm:</p>
            
            <div class="button-container">
              <a href="${deletionUrl}" class="button">Confirm Account Deletion</a>
            </div>
            
            <div class="link-container">
              <p>If the button doesn't work, copy and paste this link:</p>
              <div class="link-url">${deletionUrl}</div>
            </div>
            
            <div class="warning">
              <p><strong>⏰ Important:</strong> This deletion link will expire in 24 hours for security reasons.</p>
            </div>
            
            <div class="data-loss">
              <h3>⚠️ What will be deleted:</h3>
              <ul>
                <li>Your personal profile information</li>
                <li>Your order history</li>
                <li>Your saved addresses</li>
                <li>Your wishlist and favorites</li>
                <li>Your payment methods</li>
              </ul>
              <p style="margin-top: 15px; color: #721c24; font-weight: 600;">This action is permanent and cannot be undone!</p>
            </div>
            
            <p>If you did NOT request account deletion, please ignore this email and your account will remain active. For security, consider changing your password.</p>
            
            <p>If you're having issues with our service, we'd love to help! Please contact our support team before deleting your account.</p>
            
            <p>Thank you for being part of the IZAJ family. We hope to see you again in the future!</p>
            
            <p>Best regards,<br><strong>The IZAJ Lighting Centre Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 IZAJ Lighting Centre. All rights reserved.</p>
            <p>For support, contact us at <strong>izajtrading@gmail.com</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hello ${userName},
      
      We received a request to permanently delete your IZAJ Lighting Centre account. If you wish to proceed, please visit this link:
      
      ${deletionUrl}
      
      This link will expire in 24 hours for security reasons.
      
      WARNING: This will permanently delete:
      - Your personal profile information
      - Your order history
      - Your saved addresses
      - Your wishlist and favorites
      - Your payment methods
      
      This action cannot be undone!
      
      If you did NOT request account deletion, please ignore this email and your account will remain active.
      
      Best regards,
      The IZAJ Lighting Centre Team
    `;

    await this.sendEmail({
      to: email,
      subject: 'Confirm Account Deletion - IZAJ Lighting Centre',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();

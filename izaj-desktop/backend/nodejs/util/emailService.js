import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

class EmailService {
  constructor() {
    const config = {
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

  async sendEmail(options) {
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
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Helper function to clean HTML and remove outer wrappers
  cleanHtmlContent(html) {
    if (!html) return '';
    
    let cleaned = html.trim();
    
    // Remove DOCTYPE if present
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    
    // If contains full HTML document structure, extract body content
    if (cleaned.match(/<html[^>]*>/i)) {
      // Extract content between <body> tags (if present)
      const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        cleaned = bodyMatch[1];
      } else {
        // If no body tag, remove html/head tags
        cleaned = cleaned
          .replace(/<html[^>]*>/gi, '')
          .replace(/<\/html>/gi, '')
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
      }
    }
    
    // Remove style tags and script tags
    cleaned = cleaned
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove email-container wrapper if user copied the entire template
    // Only remove if it's the outermost container
    if (cleaned.match(/<div[^>]*class\s*=\s*["']email-container["'][^>]*>/i)) {
      // Extract content inside email-container
      const containerMatch = cleaned.match(/<div[^>]*class\s*=\s*["']email-container["'][^>]*>([\s\S]*?)<\/div>/i);
      if (containerMatch) {
        cleaned = containerMatch[1];
        // Also remove header, footer, and button-container if they exist (user copied full template)
        cleaned = cleaned
          .replace(/<div[^>]*class\s*=\s*["']header["'][^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class\s*=\s*["']footer["'][^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class\s*=\s*["']button-container["'][^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*class\s*=\s*["']content["'][^>]*>/gi, '')
          .replace(/<\/div>\s*<\/div>\s*$/, ''); // Remove closing content div
      }
    }
    
    // Remove message-content wrapper if user copied it (to avoid double wrapping)
    // Only if it's the outermost div
    if (cleaned.trim().match(/^<div[^>]*class\s*=\s*["']message-content["'][^>]*>/i)) {
      const messageMatch = cleaned.match(/^<div[^>]*class\s*=\s*["']message-content["'][^>]*>([\s\S]*?)<\/div>$/i);
      if (messageMatch) {
        cleaned = messageMatch[1];
      }
    }
    
    // Clean up extra whitespace
    cleaned = cleaned.trim();
    
    // If cleaned content is empty or too short, return original
    if (!cleaned || cleaned.length < 10) {
      return html.trim();
    }
    
    return cleaned;
  }

  // Check if message contains HTML tags
  isHtmlContent(text) {
    if (!text) return false;
    // Check for HTML tags (but not just <br> or <p> alone)
    const htmlTagPattern = /<(?:[^>"']|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')*>/i;
    return htmlTagPattern.test(text);
  }

  async sendSubscriptionMessage(email, customMessage, webAppUrl = 'https://izaj.com') {
    // Check if message is HTML formatted
    const isHtml = customMessage ? this.isHtmlContent(customMessage) : false;
    
    // If HTML, clean it to remove outer wrappers
    const cleanedMessage = customMessage ? (isHtml ? this.cleanHtmlContent(customMessage) : customMessage) : '';
    
    // If HTML format, use user's HTML directly (they provide full template). If plain text, use full template
    const html = isHtml ? cleanedMessage : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Newsletter Update - IZAJ</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Jost', 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #000000;
            background: #ffffff;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e5e5;
          }
          
          .header {
            background: #000000;
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .header h1 {
            font-family: 'Jost', sans-serif;
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
          }
          
          .header p {
            font-family: 'Jost', sans-serif;
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content {
            padding: 40px 30px;
            background: #ffffff;
          }
          
          .message-content {
            background: #f8f8f8;
            padding: 25px;
            margin: 25px 0;
            border-left: 3px solid #000000;
            font-family: 'Jost', sans-serif;
            font-size: 16px;
            color: #333333;
            line-height: 1.6;
          }
          
          .message-content * {
            max-width: 100%;
          }
          
          .message-content h1,
          .message-content h2,
          .message-content h3,
          .message-content h4,
          .message-content h5,
          .message-content h6 {
            font-family: 'Jost', sans-serif;
            color: #000000;
            margin: 16px 0;
            line-height: 1.3;
          }
          
          .message-content h2 {
            font-size: 24px;
            font-weight: 600;
          }
          
          .message-content h3 {
            font-size: 20px;
            font-weight: 600;
          }
          
          .message-content p {
            margin: 16px 0;
          }
          
          .message-content ul,
          .message-content ol {
            margin: 16px 0;
            padding-left: 20px;
          }
          
          .message-content li {
            margin: 8px 0;
          }
          
          .message-content a {
            color: #000000;
            text-decoration: underline;
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
            font-family: 'Jost', sans-serif;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
            border: 2px solid #000000;
          }
          
          .button:hover {
            background: #ffffff;
            color: #000000;
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
            font-family: 'Jost', sans-serif;
          }
          
          .footer a {
            color: #000000;
            text-decoration: underline;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .header, .content, .footer {
              padding: 25px 20px;
            }
            
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>IZAJ Lighting Centre</h1>
           
          </div>
          
          <div class="content">
            ${cleanedMessage ? `
            <div class="message-content">
              ${cleanedMessage}
            </div>
            ` : '<p>No message content available.</p>'}
            
            <div class="button-container">
              <a href="${webAppUrl}" class="button">Visit Our Website</a>
            </div>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>The IZAJ Lighting Centre Team</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 IZAJ Lighting Centre. All rights reserved.</p>
            <p>For support, contact us at <strong>izajtrading@gmail.com</strong></p>
            <p><a href="${webAppUrl}/unsubscribe">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${customMessage ? customMessage.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ') : ''}
      
      Visit our website: ${webAppUrl}
      
      Best regards,
      The IZAJ Lighting Centre Team
      
      © 2024 IZAJ Lighting Centre. All rights reserved.
      For support, contact us at izajtrading@gmail.com
    `;

    await this.sendEmail({
      to: email,
      subject: 'Newsletter Update from IZAJ Lighting Centre',
      html,
      text,
    });
  }
}

export const emailService = new EmailService();


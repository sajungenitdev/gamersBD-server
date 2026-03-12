// services/email.service.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    // Log environment variables for debugging (remove in production)
    console.log('📧 Email Service Initializing...');
    console.log('=================================');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ MISSING');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set (length: ' + process.env.EMAIL_PASS.length + ')' : '❌ MISSING');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'smtp.gmail.com (default)');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT || '587 (default)');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
    console.log('=================================');

    // Validate credentials before creating transporter
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ CRITICAL: Email credentials are missing in .env file!');
    }

    // Create transporter with explicit auth
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // Only for development
      },
      debug: true, // Enable debug logs
      logger: true // Log to console
    });

    // Verify connection configuration
    this.verifyConnection();

    // Template cache
    this.templates = {};
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified successfully');
    } catch (error) {
      console.error('❌ Email server connection failed:');
      console.error('   Error:', error.message);
      
      if (error.message.includes('Missing credentials for "PLAIN"')) {
        console.error('   🔧 FIX: EMAIL_USER or EMAIL_PASS is empty or incorrect in .env file');
        console.error('   🔧 Make sure EMAIL_PASS is the 16-digit app password with NO SPACES');
      } else if (error.message.includes('Invalid login')) {
        console.error('   🔧 FIX: Wrong password. Generate a new App Password at:');
        console.error('   🔧 https://myaccount.google.com/apppasswords');
      }
    }
  }

  /**
   * Load and compile email template
   */
  async loadTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
      
      // Read template file
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template with Handlebars
      const template = handlebars.compile(templateSource);
      
      // Return compiled HTML with data
      return template(data);
    } catch (error) {
      console.error('Error loading email template:', error);
      // Fallback to inline HTML if template not found
      return this.getFallbackTemplate(templateName, data);
    }
  }

  /**
   * Fallback templates in case files are missing
   */
  getFallbackTemplate(templateName, data) {
    const templates = {
      'order-confirmation': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-details { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-size: 18px; font-weight: bold; color: #667eea; }
            .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Order Confirmed!</h1>
              <p>Thank you for shopping with GamersBD</p>
            </div>
            <div class="content">
              <h2>Hello ${data.userName || 'Valued Customer'},</h2>
              <p>Your order has been successfully placed and is being processed.</p>
              
              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> ${data.orderNumber}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                <p><strong>Payment Status:</strong> ${data.paymentStatus}</p>
                
                <h4>Items Ordered:</h4>
                ${data.items.map(item => `
                  <div class="item">
                    <p><strong>${item.name}</strong> x ${item.quantity}</p>
                    <p>Price: ৳${item.price} | Total: ৳${item.total}</p>
                  </div>
                `).join('')}
                
                <div class="total">
                  <p>Subtotal: ৳${data.subtotal}</p>
                  <p>Shipping: ৳${data.shipping}</p>
                  <p>Tax: ৳${data.tax}</p>
                  <p><strong>Total: ৳${data.total}</strong></p>
                </div>
              </div>
              
              <h4>Shipping Address:</h4>
              <p>
                ${data.shippingAddress.fullName}<br>
                ${data.shippingAddress.addressLine1}<br>
                ${data.shippingAddress.addressLine2 ? data.shippingAddress.addressLine2 + '<br>' : ''}
                ${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.postalCode}<br>
                ${data.shippingAddress.country}<br>
                Phone: ${data.shippingAddress.phone}
              </p>
              
              <p><strong>Note:</strong> Your order is pending confirmation. Our admin will review and confirm your order within 24 hours. You will receive another email once your order is confirmed.</p>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${data.orderId}/tracking" class="button">Track Your Order</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} GamersBD. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'order-status-update': `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Status Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px; }
            .header { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .status { font-size: 24px; padding: 15px; border-radius: 5px; text-align: center; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-confirmed { background: #d4edda; color: #155724; }
            .status-processing { background: #cce5ff; color: #004085; }
            .status-shipped { background: #d1c4e9; color: #512da8; }
            .status-out_for_delivery { background: #ffe0b2; color: #e65100; }
            .status-delivered { background: #c8e6c9; color: #1b5e20; }
            .status-cancelled { background: #ffcdd2; color: #b71c1c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <p>Hello ${data.userName},</p>
            <p>Your order <strong>#${data.orderNumber}</strong> status has been updated to:</p>
            <div class="status status-${data.status}">
              <strong>${this.getStatusText(data.status)}</strong>
            </div>
            ${data.trackingNumber ? `<p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>` : ''}
            ${data.carrier ? `<p><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
            ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${data.orderId}/tracking" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Order</a>
            </p>
          </div>
        </body>
        </html>
      `
    };
    
    return templates[templateName] || '<p>Email notification</p>';
  }

  getStatusColor(status) {
    const colors = {
      'pending': '#f39c12',
      'confirmed': '#27ae60',
      'processing': '#3498db',
      'shipped': '#9b59b6',
      'in_transit': '#e67e22',
      'out_for_delivery': '#e67e22',
      'delivered': '#2ecc71',
      'cancelled': '#e74c3c',
      'refunded': '#95a5a6',
      'on_hold': '#f1c40f'
    };
    return colors[status] || '#333';
  }

  getStatusText(status) {
    const texts = {
      'pending': '⏳ Pending Confirmation',
      'confirmed': '✅ Order Confirmed',
      'processing': '⚙️ Processing',
      'shipped': '📦 Shipped',
      'in_transit': '🚚 In Transit',
      'out_for_delivery': '🚚 Out for Delivery',
      'delivered': '✅ Delivered',
      'cancelled': '❌ Cancelled',
      'refunded': '💰 Refunded',
      'on_hold': '⏸️ On Hold'
    };
    return texts[status] || status;
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, attachments = []) {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Email credentials not configured in .env file');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"GamersBD" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      console.log(`📧 Sending email to: ${to}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order, user) {
    try {
      const templateData = {
        userName: user.name || 'Valued Customer',
        orderNumber: order.orderNumber,
        orderId: order._id,
        orderDate: new Date(order.createdAt).toLocaleString('en-BD', {
          timeZone: 'Asia/Dhaka'
        }),
        paymentMethod: order.payment.method,
        paymentStatus: order.payment.status,
        items: order.items.map(item => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.priceAtTime,
          total: item.priceAtTime * item.quantity
        })),
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        tax: order.tax,
        total: order.total,
        shippingAddress: order.shippingAddress
      };

      const html = await this.loadTemplate('order-confirmation', templateData);
      
      return await this.sendEmail(
        user.email,
        `🎮 Order Confirmed #${order.orderNumber}`,
        html
      );
    } catch (error) {
      console.error('Order confirmation email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(order, user, message = '') {
    try {
      const statusMessages = {
        'confirmed': 'Your order has been confirmed by our admin!',
        'processing': 'Your order is now being processed',
        'shipped': 'Your order has been shipped',
        'in_transit': 'Your order is in transit',
        'out_for_delivery': 'Your order is out for delivery',
        'delivered': 'Your order has been delivered',
        'cancelled': 'Your order has been cancelled',
        'refunded': 'Your payment has been refunded',
        'on_hold': 'Your order is temporarily on hold'
      };

      const templateData = {
        userName: user.name || 'Valued Customer',
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: order.status,
        statusText: this.getStatusText(order.status),
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        message: message || statusMessages[order.status] || `Order status updated to ${order.status}`,
        estimatedDelivery: order.estimatedDelivery
      };

      const html = await this.loadTemplate('order-status-update', templateData);
      
      return await this.sendEmail(
        user.email,
        `📦 Order Update #${order.orderNumber} - ${this.getStatusText(order.status)}`,
        html
      );
    } catch (error) {
      console.error('Order status update email error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(user) {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Welcome to GamersBD</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Welcome to GamersBD!</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Hello ${user.name || 'Gamer'}!</h2>
              <p>Thank you for registering with GamersBD - your ultimate gaming destination!</p>
              <p>Start exploring our collection of games, toys, and accessories.</p>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Shopping →</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail(
        user.email,
        '🎮 Welcome to GamersBD!',
        html
      );
    } catch (error) {
      console.error('Welcome email error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
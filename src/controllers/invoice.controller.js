// controllers/invoice.controller.js
const Order = require('../models/Order');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// @desc    Generate and download order invoice
// @route   GET /api/orders/:orderId/invoice
// @access  Private
const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Fetch order with populated data
    const order = await Order.findById(orderId)
      .populate('items.product', 'name price images sku')
      .populate('user', 'name email phone');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    if (order.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    
    doc.pipe(res);
    
    // Company Header
    doc.fontSize(20).font('Helvetica-Bold').text('GamersBD', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('123 Gaming Street, Dhaka, Bangladesh', { align: 'center' });
    doc.text('Email: info@gamersbd.com | Phone: +880 1234 567890', { align: 'center' });
    doc.moveDown();
    
    // Invoice Title
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice Details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Number: INV-${order.orderNumber}`, { continued: true });
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, { align: 'right' });
    doc.text(`Order Number: ${order.orderNumber}`, { continued: true });
    doc.text(`Order Date: ${new Date(order.placedAt).toLocaleDateString()}`, { align: 'right' });
    
    doc.moveDown();
    
    // Bill To & Ship To
    const billToY = doc.y;
    doc.text('Bill To:', { underline: true });
    doc.text(order.billingAddress.fullName);
    doc.text(order.billingAddress.addressLine1);
    if (order.billingAddress.addressLine2) doc.text(order.billingAddress.addressLine2);
    doc.text(`${order.billingAddress.city}, ${order.billingAddress.state}`);
    doc.text(`${order.billingAddress.postalCode}, ${order.billingAddress.country}`);
    doc.text(`Phone: ${order.billingAddress.phone}`);
    
    // Ship To
    const shipToX = 300;
    doc.text('Ship To:', shipToX, doc.y - 100, { underline: true });
    doc.text(order.shippingAddress.fullName, shipToX, doc.y);
    doc.text(order.shippingAddress.addressLine1, shipToX, doc.y + 15);
    if (order.shippingAddress.addressLine2) doc.text(order.shippingAddress.addressLine2, shipToX, doc.y + 30);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, shipToX, doc.y + 45);
    doc.text(`${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`, shipToX, doc.y + 60);
    doc.text(`Phone: ${order.shippingAddress.phone}`, shipToX, doc.y + 75);
    
    doc.moveDown(4);
    
    // Order Items Table
    const tableTop = doc.y;
    const itemX = 50;
    const descX = 150;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;
    
    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Item', itemX, tableTop);
    doc.text('Description', descX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    doc.moveDown();
    doc.font('Helvetica');
    
    let currentY = tableTop + 20;
    
    order.items.forEach((item, index) => {
      const productName = item.product.name;
      const truncatedName = productName.length > 30 ? productName.substring(0, 27) + '...' : productName;
      
      doc.text(`${index + 1}`, itemX, currentY);
      doc.text(truncatedName, descX, currentY);
      doc.text(item.quantity.toString(), qtyX, currentY);
      doc.text(`$${item.priceAtTime.toFixed(2)}`, priceX, currentY);
      doc.text(`$${(item.priceAtTime * item.quantity).toFixed(2)}`, totalX, currentY);
      
      currentY += 20;
      
      // Add new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    });
    
    currentY += 10;
    
    // Draw line
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;
    
    // Totals
    const totalsX = 380;
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`$${order.subtotal.toFixed(2)}`, totalX, currentY);
    currentY += 20;
    
    doc.text('Shipping:', totalsX, currentY);
    doc.text(order.shippingCost === 0 ? 'Free' : `$${order.shippingCost.toFixed(2)}`, totalX, currentY);
    currentY += 20;
    
    doc.text('Tax (10%):', totalsX, currentY);
    doc.text(`$${order.tax.toFixed(2)}`, totalX, currentY);
    currentY += 20;
    
    if (order.discount > 0) {
      doc.text('Discount:', totalsX, currentY);
      doc.text(`-$${order.discount.toFixed(2)}`, totalX, currentY);
      currentY += 20;
    }
    
    doc.font('Helvetica-Bold');
    doc.text('Total:', totalsX, currentY);
    doc.text(`$${order.total.toFixed(2)}`, totalX, currentY);
    currentY += 20;
    
    // Payment Information
    doc.font('Helvetica');
    doc.moveDown();
    doc.text('Payment Information:', { underline: true });
    doc.text(`Method: ${order.payment.method.replace(/_/g, ' ').toUpperCase()}`);
    doc.text(`Status: ${order.payment.status.toUpperCase()}`);
    if (order.payment.transactionId) {
      doc.text(`Transaction ID: ${order.payment.transactionId}`);
    }
    
    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8);
      doc.text(
        `Thank you for shopping with GamersBD! | Page ${i + 1} of ${pageCount}`,
        50,
        750,
        { align: 'center' }
      );
    }
    
    doc.end();
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
};

// @desc    Get invoice HTML (for preview)
// @route   GET /api/orders/:orderId/invoice/preview
// @access  Private
const previewInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId)
      .populate('items.product', 'name price images sku')
      .populate('user', 'name email phone');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    if (order.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    res.json({
      success: true,
      invoice: {
        order: order,
        company: {
          name: 'GamersBD',
          address: '123 Gaming Street, Dhaka, Bangladesh',
          email: 'info@gamersbd.com',
          phone: '+880 1234 567890',
          website: 'www.gamersbd.com'
        }
      }
    });
  } catch (error) {
    console.error('Invoice preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice preview'
    });
  }
};

module.exports = {
  downloadInvoice,
  previewInvoice
};
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import connectDB from '../../../../../lib/mongodb';
import FormSubmission from '../../../../../models/FormSubmission';
import User from '../../../../../models/User';
import { reportError } from '../../../../../lib/reportError';

// POST /api/forms/[id]/share - Share form with email addresses (Level 5 only)
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only Level 5 (Super Admin) can share forms by email
    if (user.level !== 5) {
      return NextResponse.json({ error: 'Only Super Admins can share forms by email' }, { status: 403 });
    }

    const { id } = await params;
    
    // Validate form ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }

    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      reportError(parseError, { route: '/api/forms/[id]/share', detail: 'Error parsing request body' });
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { emails, permissions = 'view' } = body;

    // Validate emails
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'At least one email address is required' }, { status: 400 });
    }

    // Validate permissions
    if (!['view', 'edit'].includes(permissions)) {
      return NextResponse.json({ error: 'Invalid permissions. Must be "view" or "edit"' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid email format', 
        invalidEmails 
      }, { status: 400 });
    }

    // Normalize emails (lowercase, trim)
    const normalizedEmails = emails.map(email => email.toLowerCase().trim());

    // Add or update shared emails
    const results = [];
    const existingEmails = new Set(form.sharedWithEmails.map(share => share.email));

    for (const email of normalizedEmails) {
      const existingIndex = form.sharedWithEmails.findIndex(share => share.email === email);
      
      if (existingIndex >= 0) {
        // Update existing share
        form.sharedWithEmails[existingIndex].permissions = permissions;
        form.sharedWithEmails[existingIndex].sharedBy = user._id;
        form.sharedWithEmails[existingIndex].sharedAt = new Date();
        results.push({ email, action: 'updated', success: true });
      } else {
        // Add new share
        form.sharedWithEmails.push({
          email,
          sharedBy: user._id,
          sharedAt: new Date(),
          permissions,
        });
        results.push({ email, action: 'added', success: true });
      }
    }

    await form.save();

    return NextResponse.json({
      success: true,
      message: `Form shared with ${normalizedEmails.length} email address(es)`,
      results,
      sharedWithEmails: form.sharedWithEmails,
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/share', detail: 'Error sharing form' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/forms/[id]/share - Remove shared email addresses (Level 5 only)
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only Level 5 (Super Admin) can unshare forms
    if (user.level !== 5) {
      return NextResponse.json({ error: 'Only Super Admins can unshare forms' }, { status: 403 });
    }

    const { id } = await params;
    
    // Validate form ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }

    const form = await FormSubmission.findById(id);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      // If no body, remove all shared emails
      body = { emails: [] };
    }

    const { emails } = body || {};

    // If no emails specified, remove all
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      const removedCount = form.sharedWithEmails.length;
      form.sharedWithEmails = [];
      await form.save();
      
      return NextResponse.json({
        success: true,
        message: `Removed all shared email addresses (${removedCount})`,
        removedCount,
      });
    }

    // Normalize emails
    const normalizedEmails = emails.map(email => email.toLowerCase().trim());
    
    // Remove specified emails
    const initialCount = form.sharedWithEmails.length;
    form.sharedWithEmails = form.sharedWithEmails.filter(
      share => !normalizedEmails.includes(share.email)
    );
    const removedCount = initialCount - form.sharedWithEmails.length;

    await form.save();

    return NextResponse.json({
      success: true,
      message: `Removed ${removedCount} email address(es) from shared list`,
      removedCount,
      sharedWithEmails: form.sharedWithEmails,
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/share', detail: 'Error unsharing form' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/forms/[id]/share - Get shared email addresses (Level 5 only)
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only Level 5 (Super Admin) can view shared emails
    if (user.level !== 5) {
      return NextResponse.json({ error: 'Only Super Admins can view shared emails' }, { status: 403 });
    }

    const { id } = await params;
    
    // Validate form ID
    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 });
    }

    const form = await FormSubmission.findById(id)
      .populate('sharedWithEmails.sharedBy', 'name email');
    
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      sharedWithEmails: form.sharedWithEmails || [],
    });
  } catch (error) {
    reportError(error, { route: '/api/forms/[id]/share', detail: 'Error fetching shared emails' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

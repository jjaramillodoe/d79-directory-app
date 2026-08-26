import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import connectDB from '../../../lib/mongodb';
import FormSubmission from '../../../models/FormSubmission';
import User from '../../../models/User';
import { currentSchoolYear, isValidSchoolYear } from '../../../lib/schoolYear';
import { yearMatch, findFormsList, decorateFormList } from '../../../lib/formList';
import { reportError } from '../../../lib/reportError';
import { enforceRateLimit } from '../../../lib/userAccess';
import { getYearSettings } from '../../../lib/schoolYearSettings';
import { getPublishedOrJson } from '../../../lib/questionBank';

async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const yearFilter = yearMatch(searchParams.get('schoolYear'));
    const assignedIds = (user.assignedForms || []).map((assignment) => assignment.formId).filter(Boolean);

    let match = { ...yearFilter };
    if (user.level === 5) {
      match = { ...yearFilter };
    } else if (user.level === 4) {
      match = {
        ...yearFilter,
        $or: [
          { schoolName: user.schoolName },
          { _id: { $in: assignedIds } },
        ],
      };
    } else if (user.level === 3) {
      if (assignedIds.length === 0) {
        return NextResponse.json({ forms: [] });
      }
      match = { ...yearFilter, _id: { $in: assignedIds } };
    } else if (user.level === 2) {
      match = {
        ...yearFilter,
        $or: [
          { schoolName: user.schoolName },
          { userId: user._id },
          { _id: { $in: assignedIds } },
        ],
      };
    } else {
      match = {
        ...yearFilter,
        $or: [
          { userId: user._id },
          { _id: { $in: assignedIds } },
        ],
      };
    }

    const listed = await findFormsList(match);
    const forms = await decorateFormList(listed, user, { includeCollaborators: user.level === 5 });

    return NextResponse.json({ forms });
  } catch (error) {
    reportError(error, { route: 'GET /api/forms' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limited = await enforceRateLimit(`rl:forms-create:${session.user.id || 'anon'}`, 20, 60);
    if (limited) return limited;

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.level < 4) {
      return NextResponse.json({ error: 'Insufficient permissions. Only Admin Principals (Level 4) and Super Admins (Level 5) can create forms.' }, { status: 403 });
    }

    const body = await request.json();
    const requestedSchool = String(body.schoolName || '').trim();
    const schoolName = user.level < 5 ? String(user.schoolName || '').trim() : requestedSchool;
    const { initialOwnerEmail, schoolYear } = body;
    const formSchoolYear = isValidSchoolYear(schoolYear) ? String(schoolYear).trim() : currentSchoolYear();
    const yearSettings = await getYearSettings(formSchoolYear);
    if (yearSettings.archived) {
      return NextResponse.json({
        error: `${formSchoolYear} is archived. Create or duplicate a plan for the current school year instead.`,
      }, { status: 400 });
    }

    if (!schoolName || !schoolName.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }

    const duplicatePlan = await FormSubmission.findOne({
      schoolName: schoolName.trim(),
      schoolYear: formSchoolYear,
    }).select('_id');
    if (duplicatePlan) {
      return NextResponse.json({
        error: `${schoolName.trim()} already has a ${formSchoolYear} plan.`,
        existingFormId: String(duplicatePlan._id),
      }, { status: 409 });
    }

    let formOwner = user;
    let principalEmail = user.email;
    let principalName = user.name;

    if (user.level === 5 && initialOwnerEmail && initialOwnerEmail !== user.email) {
      const initialOwner = await User.findOne({ email: initialOwnerEmail });
      if (!initialOwner) {
        return NextResponse.json({ error: 'Initial owner not found' }, { status: 404 });
      }

      if (initialOwner.level !== 4) {
        return NextResponse.json({
          error: 'Initial owner must be a Level 4 (Admin Principal) user',
        }, { status: 400 });
      }

      formOwner = initialOwner;
      principalEmail = initialOwner.email;
      principalName = initialOwner.name;
    }

    let questionBankVersion = null;
    try {
      const published = await getPublishedOrJson({
        schoolYear: formSchoolYear,
        version: yearSettings.questionBankVersion,
      });
      if (published?.version) {
        questionBankVersion = published.version;
      }
    } catch (error) {
      console.warn('Could not stamp question bank version on new form:', error.message);
    }

    const newForm = new FormSubmission({
      userId: formOwner._id,
      schoolName: schoolName.trim(),
      principalEmail: principalEmail,
      principalName: principalName,
      status: 'draft',
      currentStep: 1,
      createdBy: user._id,
      questionBankVersion,
      schoolYear: formSchoolYear,
    });

    if (user.level === 5 && initialOwnerEmail && initialOwnerEmail !== user.email) {
      newForm.transferHistory = [{
        from: user._id,
        to: formOwner._id,
        transferredBy: user._id,
        transferredAt: new Date(),
        reason: 'Initial creation by Super Admin',
      }];
    }

    await newForm.save();

    const existingAssignment = formOwner.assignedForms.find(
      (assignment) => assignment.formId.toString() === newForm._id.toString()
    );

    if (!existingAssignment) {
      formOwner.assignedForms.push({
        formId: newForm._id,
        assignedBy: user._id,
        permissions: 'edit',
        assignedAt: new Date(),
        assignedSections: [],
      });
      await formOwner.save();
    } else if (existingAssignment.permissions !== 'edit') {
      existingAssignment.permissions = 'edit';
      await formOwner.save();
    }

    return NextResponse.json({
      success: true,
      formId: newForm._id.toString(),
      message: 'Form created successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({
        error: 'A plan already exists for this school and year.',
      }, { status: 409 });
    }
    reportError(error, { route: '/api/forms', detail: 'Error creating form' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET, POST };

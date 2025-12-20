# Fix for dswanson@schools.nyc.gov Form Issue

## Problem
Principal dswanson@schools.nyc.gov was unable to edit form `691f6983fae9a9a65f95e3b3` - text would disappear when typing. This was caused by missing edit permissions in the database.

## Solution

### Option 1: Run the Automated Script (Recommended)
Run the script to assign all principals to their forms with edit permissions:

```bash
npm run assign-principals
```

This will:
- Find all forms in the database
- Assign each form's principal (owner) with 'edit' permissions
- Update existing assignments to ensure they have 'edit' permissions

### Option 2: Manual MongoDB Fix (Quick Fix for dswanson)
If you need to fix just dswanson's form immediately, run this in MongoDB:

```javascript
// Connect to your MongoDB database first
use your-database-name

// Update dswanson's assignment for the specific form
db.users.updateOne(
  { 
    email: "dswanson@schools.nyc.gov",
    "assignedForms.formId": ObjectId("691f6983fae9a9a65f95e3b3")
  },
  { 
    $set: { 
      "assignedForms.$.permissions": "edit"
    }
  }
)

// If the form is not yet assigned, add it:
db.users.updateOne(
  { email: "dswanson@schools.nyc.gov" },
  {
    $push: {
      assignedForms: {
        formId: ObjectId("691f6983fae9a9a65f95e3b3"),
        permissions: "edit",
        assignedAt: new Date(),
        assignedBy: ObjectId("...") // You may need to find the admin user ID
      }
    }
  }
)
```

## What Was Fixed

1. **Database Script**: Created `src/scripts/assign-principals-to-forms.js` to automatically assign all principals to their forms with edit permissions

2. **Frontend Permission Display**: Added a permission indicator banner at the top of the form page showing:
   - 🛡️ **Owner Access** (green) - Full control
   - 📄 **Edit Access** (blue) - Can edit
   - ⚠️ **View Only - Cannot Edit** (yellow) - Read-only

3. **Better Error Handling**: 
   - Save operations now check permissions before attempting to save
   - Clear error messages when permission is denied
   - Visual error indicators on the form page

4. **API Enhancement**: The GET `/api/forms/[id]` endpoint now returns `userPermission` field to help the frontend determine access level

## Testing

After running the script or manual fix:
1. Have dswanson log in and navigate to the form
2. Check that the permission banner shows "Edit Access" (blue) or "Owner Access" (green)
3. Try typing in a form field - text should persist
4. Verify auto-save works without errors

## Prevention

Going forward, when forms are created, the principal should automatically be assigned with edit permissions. The script ensures all existing forms are properly configured.


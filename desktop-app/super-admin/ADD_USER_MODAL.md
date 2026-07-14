# Add User Modal Documentation

## Overview

The Add User Modal provides a clean, professional interface for Super Administrators to create new user accounts across the BKWB platform. The modal includes comprehensive form validation, password requirements, and role assignment capabilities.

## Features Implemented

### Modal Header

**Title**: "Add User"

**Subtitle**: "Provision a new administrative account"

**Close Button**: X icon in top-right corner

**Visual Design**:
- Clean header with border-bottom
- Professional typography
- Close button with hover effect

---

### Form Fields

#### 1. Full Name

**Label**: "FULL NAME" (uppercase, small, bold)

**Input Features**:
- User icon (left side)
- Placeholder: "e.g. Sarah Connor"
- Full-width input
- Border focus effect (blue ring)

**Validation**:
- Required field
- Cannot be empty or whitespace only
- Error message: "Full name is required"

**Visual Design**:
- Icon: gray-400
- Border: gray-300 (default), red-300 (error)
- Focus: blue-500 ring
- Text: small (text-sm)

---

#### 2. Email Address

**Label**: "EMAIL ADDRESS" (uppercase, small, bold)

**Input Features**:
- Mail icon (left side)
- Placeholder: "user@organization.com"
- Email type input
- Full-width

**Validation**:
- Required field
- Must match email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Error messages:
  - "Email address is required"
  - "Invalid email format"

**Visual Design**:
- Mail icon on left
- Same styling as Full Name field
- Error border if validation fails

---

#### 3. Role Assignment

**Label**: "ROLE ASSIGNMENT" (uppercase, small, bold)

**Input Type**: Dropdown select

**Placeholder**: "Select a permission tier..."

**Available Roles**:
- Super Admin
- Water Billing Staff
- Meter Reader
- Consumer

**Features**:
- Chevron down icon (right side)
- Custom select styling
- Full-width dropdown
- Hover and focus states

**Validation**:
- Required field
- Must select a role
- Error message: "Role assignment is required"

**Visual Design**:
- ChevronDown icon: gray-400, right-aligned
- Dropdown appears native but styled
- Focus: blue-500 ring
- Error: red-300 border

---

#### 4. Temporary Password

**Label**: "TEMPORARY PASSWORD" (uppercase, small, bold)

**Input Features**:
- Lock icon (left side)
- Eye/EyeOff icon (right side) - toggle visibility
- Placeholder: "••••••••••••" (bullet points)
- Type: password (toggleable to text)

**Password Requirements** (shown below field):
- "Password must contain at least 12 characters and one symbol."
- Text: extra small, gray-500

**Validation Rules**:
- Required field
- Minimum 12 characters
- Must contain at least one symbol (!@#$%^&*(),.?":{}|<>)

**Error Messages**:
- "Temporary password is required"
- "Password must be at least 12 characters"
- "Password must contain at least one symbol"

**Visual Design**:
- Lock icon: left, gray-400
- Eye/EyeOff toggle: right, gray-400, hover gray-600
- Helper text: below field, gray-500
- Error text: below helper, red-600

---

#### 5. MFA Requirement

**Type**: Checkbox with label

**Label**: "Require MFA on first login"

**Features**:
- Standard checkbox (4x4)
- Blue when checked
- Label is clickable
- Optional field (not required)

**Visual Design**:
- Checkbox: blue-600 when checked
- Border: gray-300
- Focus: blue-500 ring
- Label: small text, gray-700

---

### Form Validation

#### Validation Trigger
- On submit button click
- Real-time validation optional (not implemented)

#### Validation Logic
```typescript
- Full Name: Required, non-empty
- Email: Required, valid email format
- Role: Required, must select from dropdown
- Password: Required, min 12 chars, contains symbol
- MFA: Optional, no validation
```

#### Error Display
- Red border on invalid fields
- Error message below field
- Red text (text-red-600)
- Extra small font (text-xs)

---

### Modal Footer

**Background**: Light gray (bg-gray-50)

**Border**: Top border (border-gray-200)

**Buttons** (right-aligned, space-x-3):

#### Cancel Button
- Text: "Cancel"
- Style: Gray text, hover gray-100 background
- Action: Close modal, clear form

#### Create User Button
- Text: "Create User"
- Style: Blue background (bg-blue-600), white text
- Hover: Darker blue (bg-blue-700)
- Action: Validate and submit form

---

## TypeScript Interfaces

### UserFormData
```typescript
interface UserFormData {
  fullName: string;
  emailAddress: string;
  role: string;
  temporaryPassword: string;
  requireMFA: boolean;
}
```

### AddUserModalProps
```typescript
interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => void;
}
```

---

## Component State

### Form Data State
```typescript
const [formData, setFormData] = useState<UserFormData>({
  fullName: '',
  emailAddress: '',
  role: '',
  temporaryPassword: '',
  requireMFA: false,
});
```

### Other States
```typescript
const [showPassword, setShowPassword] = useState(false);
const [errors, setErrors] = useState<Partial<UserFormData>>({});
```

---

## Component Functions

### validateForm()
- Validates all form fields
- Sets error messages
- Returns boolean (true if valid)
- Checks:
  - Empty fields
  - Email format
  - Password length
  - Symbol requirement

### handleSubmit()
- Validates form
- If valid:
  - Calls onSubmit callback with form data
  - Closes modal
  - Clears form

### handleClose()
- Resets form data
- Clears errors
- Hides password
- Calls onClose callback

---

## Visual Design Specifications

### Modal Container
- **Width**: max-w-md (28rem / 448px)
- **Background**: White
- **Border Radius**: rounded-2xl (16px)
- **Shadow**: shadow-2xl
- **Z-index**: z-50

### Overlay
- **Background**: black with 50% opacity
- **Position**: Fixed, full screen
- **Flex**: Centered horizontally and vertically
- **Padding**: p-4 (16px)

### Input Fields
- **Height**: py-2.5 (10px top/bottom padding)
- **Border**: 1px solid gray-300
- **Border Radius**: rounded-lg (8px)
- **Font Size**: text-sm (14px)
- **Focus Ring**: 2px blue-500

### Icons
- **Size**: w-4 h-4 (16px)
- **Color**: gray-400
- **Position**: Absolute within input

### Labels
- **Font Size**: text-xs (12px)
- **Font Weight**: font-semibold
- **Text Transform**: uppercase
- **Color**: gray-700
- **Margin Bottom**: mb-2 (8px)

---

## User Experience Flow

### Opening Modal
1. User clicks "Add User" button
2. Modal appears with overlay
3. All fields are empty
4. Focus can be set to first field

### Filling Form
1. Enter full name
2. Enter email address
3. Select role from dropdown
4. Enter temporary password
5. Toggle password visibility if needed
6. Check MFA requirement if desired

### Validation
1. Click "Create User" button
2. Form validates all fields
3. If errors:
   - Red borders appear on invalid fields
   - Error messages show below fields
   - Form does not submit
4. If valid:
   - onSubmit callback fires
   - Success message shows
   - Modal closes

### Canceling
1. Click "Cancel" button or X icon
2. Modal closes immediately
3. Form data is cleared
4. No validation occurs

---

## Password Requirements

### Minimum Length
- 12 characters minimum
- Enforced on validation
- Error shown if too short

### Symbol Requirement
- At least one special character
- Symbols: `!@#$%^&*(),.?":{}|<>`
- Regex: `/[!@#$%^&*(),.?":{}|<>]/`
- Error shown if missing

### Visibility Toggle
- Eye icon: password hidden
- EyeOff icon: password visible
- Toggles between password/text input type

---

## Role Options

### Super Admin
- Full system access
- All permissions
- User management
- System configuration

### Water Billing Staff
- Billing operations
- Payment processing
- Resident management
- Limited admin access

### Meter Reader
- Field data entry
- Meter reading access
- Consumption tracking
- Mobile app access

### Consumer
- Basic account access
- Bill viewing
- Payment submission
- Support messaging

---

## Error Messages

### Full Name Errors
- "Full name is required"

### Email Address Errors
- "Email address is required"
- "Invalid email format"

### Role Assignment Errors
- "Role assignment is required"

### Temporary Password Errors
- "Temporary password is required"
- "Password must be at least 12 characters"
- "Password must contain at least one symbol"

---

## Success Handling

### After Successful Submission
1. Form data sent to parent component
2. Parent handles API call
3. Success alert/toast shown
4. Modal closes
5. Form clears
6. User list refreshes (in parent)

### Example Success Message
```
"User [Full Name] created successfully!"
```

---

## API Integration (Future)

### Create User Endpoint
```
POST /api/users
Content-Type: application/json

Request Body:
{
  "fullName": "Sarah Connor",
  "emailAddress": "sarah.connor@bkwb.gov.ph",
  "role": "Water Billing Staff",
  "temporaryPassword": "TempPass123!@#",
  "requireMFA": true
}

Response:
{
  "success": true,
  "userId": "user-12345",
  "message": "User created successfully"
}
```

---

## Accessibility

### Keyboard Navigation
- Tab through all form fields
- Enter to submit form
- Escape to close modal
- Space to toggle checkbox

### Screen Reader Support
- Labels properly associated with inputs
- Error messages announced
- Button actions clear
- Required fields indicated

### Focus Management
- Focus trap within modal
- First field focused on open (optional)
- Focus returns to trigger on close

---

## Responsive Design

### Desktop (Default)
- Modal: 448px width
- Comfortable padding
- All fields visible

### Tablet
- Modal: 90% width max
- Same layout
- Scrollable if needed

### Mobile
- Modal: Full width - 32px
- Single column
- Touch-friendly targets
- Comfortable spacing

---

## Future Enhancements

### Auto-generated Passwords
- Generate secure password button
- Copy to clipboard
- Show strength meter

### Email Invitation
- Send invitation email option
- Set expiration date
- Track invitation status

### Bulk User Import
- Upload CSV file
- Map columns
- Preview and confirm
- Error handling

### Role Permissions Preview
- Show what each role can do
- Permission details
- Help tooltips

### Profile Picture
- Upload avatar image
- Crop and resize
- Preview before save

---

## Testing Scenarios

### Valid Submission
1. Fill all required fields correctly
2. Click "Create User"
3. Verify form submits
4. Check modal closes
5. Verify success message

### Validation Errors
1. Leave fields empty
2. Click "Create User"
3. Verify error messages show
4. Fill fields incorrectly
5. Verify specific errors

### Password Visibility
1. Enter password
2. Click eye icon
3. Verify password visible
4. Click eyeoff icon
5. Verify password hidden

### Cancel Action
1. Fill some fields
2. Click "Cancel"
3. Verify modal closes
4. Open modal again
5. Verify fields are empty

---

## File Location

**Component**: `desktop-app/super-admin/src/components/AddUserModal.tsx`

**Size**: ~300 lines

**Dependencies**:
- React, useState
- Lucide React icons
- TypeScript interfaces

---

## Integration

### Usage in Users Page
```typescript
import AddUserModal, { UserFormData } from '../components/AddUserModal';

const [showAddModal, setShowAddModal] = useState(false);

const handleAddUser = (userData: UserFormData) => {
  // Handle user creation
  console.log('New user:', userData);
};

<AddUserModal
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  onSubmit={handleAddUser}
/>
```

---

## Conclusion

The Add User Modal provides a professional, user-friendly interface for creating new user accounts in the BKWB system. With comprehensive validation, clear error messages, and a clean design, it ensures that user creation is both secure and straightforward.

The modal follows enterprise-grade UI/UX standards with proper form validation, accessibility considerations, and a responsive design that works across all devices. It's fully typed with TypeScript and ready for backend integration.

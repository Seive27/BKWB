# Logout Feature Documentation

## Overview

A comprehensive logout flow has been implemented for the BKWB Staff Desktop Application. The logout functionality includes a confirmation modal to prevent accidental logouts and provides two logout options: standard logout from the sidebar and "Sign Out All Devices" from the Profile Settings page.

---

## Components Created

### LogoutModal Component

**File**: `src/components/LogoutModal.tsx`

**Features**:
- Modal dialog with overlay background
- Warning icon (Alert Triangle)
- Confirmation message
- Cancel and Logout buttons
- Clean, professional design
- Smooth animations
- Click outside to close
- X button to cancel

**Props**:
```typescript
interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```

**Visual Design**:
- Red accent color theme (warning/logout action)
- White card with shadow
- Red background header
- Gray footer
- Two-button layout (Cancel / Logout)

---

## Implementation Locations

### 1. Sidebar Logout Button

**File**: `src/components/Sidebar.tsx`

**Changes Made**:
- Added `useState` for modal visibility
- Added optional `onLogout` prop to Sidebar component
- Created `handleLogoutClick` function
- Created `handleLogoutConfirm` function
- Created `handleLogoutCancel` function
- Added onClick handler to Logout button
- Integrated LogoutModal component

**User Flow**:
1. User clicks "Logout" button in sidebar
2. Logout confirmation modal appears
3. User can either:
   - Click "Cancel" to dismiss modal
   - Click "Logout" to confirm
4. On confirm, logout action is executed

**Code Structure**:
```typescript
const [showLogoutModal, setShowLogoutModal] = useState(false);

const handleLogoutClick = () => {
  setShowLogoutModal(true);
};

const handleLogoutConfirm = () => {
  setShowLogoutModal(false);
  if (onLogout) {
    onLogout();
  } else {
    // Default logout behavior
    console.log('Logging out...');
  }
};
```

---

### 2. Profile Settings - Sign Out All Devices

**File**: `src/pages/ProfileSettings.tsx`

**Changes Made**:
- Added `showLogoutModal` state
- Created `handleSignOutAllDevices` function
- Created `handleLogoutConfirm` function
- Added onClick handler to "Sign Out All Devices" button
- Integrated LogoutModal component

**User Flow**:
1. User navigates to Profile Settings
2. Scrolls to "Session Information" section
3. Clicks "Sign Out All Devices" button
4. Logout confirmation modal appears
5. User confirms or cancels
6. On confirm, all devices are signed out

**Code Structure**:
```typescript
const [showLogoutModal, setShowLogoutModal] = useState(false);

const handleSignOutAllDevices = () => {
  setShowLogoutModal(true);
};

const handleLogoutConfirm = () => {
  setShowLogoutModal(false);
  console.log('Signing out all devices...');
  // In production: API call to invalidate all sessions
};
```

---

## Modal Design Specifications

### Layout
- **Width**: max-w-md (28rem / 448px)
- **Padding**: 4-6 (16-24px)
- **Border Radius**: rounded-2xl
- **Shadow**: shadow-2xl
- **Background Overlay**: bg-black bg-opacity-50
- **Z-index**: z-50 (top layer)

### Header Section
- **Background**: bg-red-50
- **Border**: border-b border-red-100
- **Icon Container**: 
  - Size: w-10 h-10
  - Background: bg-red-100
  - Icon: AlertTriangle (red-600)
- **Title**: "Confirm Logout"

### Body Section
- **Padding**: px-6 py-6
- **Primary Text**: "Are you sure you want to logout from the BKWB Staff System?"
- **Secondary Text**: "You will need to login again to access the system."
- **Text Colors**: gray-700 (primary), gray-500 (secondary)

### Footer Section
- **Background**: bg-gray-50
- **Border**: border-t border-gray-200
- **Padding**: px-6 py-4
- **Button Layout**: Flex with space-x-3

**Cancel Button**:
- Border style
- Gray color scheme
- Hover effect: bg-gray-100

**Logout Button**:
- Primary red background (bg-red-600)
- White text
- Logout icon
- Hover effect: bg-red-700

---

## Logout Logic (Ready for Backend)

### Current Implementation (Mock)
```typescript
const handleLogoutConfirm = () => {
  setShowLogoutModal(false);
  console.log('Logging out...');
  // Placeholder for production logic
};
```

### Production Implementation (To be added)

```typescript
const handleLogoutConfirm = async () => {
  setShowLogoutModal(false);
  
  try {
    // 1. Call logout API endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    // 2. Clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('sessionId');
    
    // 3. Clear session storage
    sessionStorage.clear();
    
    // 4. Reset application state (Zustand)
    useAuthStore.getState().clearAuth();
    
    // 5. Redirect to login page
    window.location.href = '/login';
    
  } catch (error) {
    console.error('Logout failed:', error);
    // Show error toast
  }
};
```

### Sign Out All Devices (Production)

```typescript
const handleLogoutConfirm = async () => {
  setShowLogoutModal(false);
  
  try {
    // 1. Call signout all devices endpoint
    await fetch('/api/auth/signout-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    // 2. Clear local data
    localStorage.clear();
    sessionStorage.clear();
    
    // 3. Reset state
    useAuthStore.getState().clearAuth();
    
    // 4. Redirect to login
    window.location.href = '/login';
    
  } catch (error) {
    console.error('Sign out all devices failed:', error);
  }
};
```

---

## User Experience Features

### Confirmation Protection
✅ Prevents accidental logouts  
✅ Clear warning message  
✅ Two-step process (click + confirm)  
✅ Easy to cancel

### Visual Feedback
✅ Modal overlay darkens background  
✅ Red color scheme indicates warning action  
✅ Alert triangle icon  
✅ Clear button labels  
✅ Hover states on buttons

### Accessibility
✅ Keyboard navigation (Enter/Escape)  
✅ Clear focus states  
✅ Semantic HTML structure  
✅ Descriptive button text  
✅ Modal trap focus (ready for implementation)

---

## Integration Points

### App.tsx (Future Enhancement)
```typescript
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const handleLogout = () => {
    // Clear authentication
    setIsAuthenticated(false);
    // Redirect to login
    // window.location.href = '/login';
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage}
        onLogout={handleLogout}  // Pass logout handler
      />
      {/* ... */}
    </div>
  );
}
```

---

## Testing Scenarios

### Test Case 1: Sidebar Logout
1. Click "Logout" button in sidebar
2. Verify modal appears
3. Click "Cancel"
4. Verify modal closes, user remains logged in
5. Click "Logout" again
6. Click "Logout" button in modal
7. Verify logout action executes

### Test Case 2: Profile Settings Logout
1. Navigate to Profile Settings
2. Scroll to Session Information section
3. Click "Sign Out All Devices"
4. Verify modal appears
5. Click "Logout"
6. Verify all devices logout action executes

### Test Case 3: Close Modal
1. Open logout modal
2. Click X button
3. Verify modal closes
4. Click logout again
5. Click outside modal
6. Verify modal closes

---

## Backend API Requirements

### Logout Endpoint
```
POST /api/auth/logout
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Sign Out All Devices Endpoint
```
POST /api/auth/signout-all
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "All sessions terminated",
  "sessionsTerminated": 3
}
```

---

## Security Considerations

### Token Invalidation
- Server must invalidate JWT tokens
- Add token to blacklist
- Set token expiration

### Session Management
- Track all active sessions
- Store device information
- Allow selective session termination

### Audit Logging
- Log all logout events
- Track IP addresses
- Record timestamps
- Store device information

---

## Files Modified/Created

### Created:
- `src/components/LogoutModal.tsx`

### Modified:
- `src/components/Sidebar.tsx`
- `src/pages/ProfileSettings.tsx`

---

## Future Enhancements

1. **Session History**
   - Show list of active sessions
   - Display device names and locations
   - Allow selective logout per device

2. **Logout Timer**
   - Auto-logout after inactivity
   - Warning before auto-logout
   - Configurable timeout duration

3. **Remember Device**
   - Option to stay logged in on trusted devices
   - Device fingerprinting
   - Reduced login frequency

4. **Logout Confirmation Preferences**
   - User setting to skip confirmation
   - Remember choice per session
   - Admin-enforced confirmation

---

## Development Status

**Status**: ✅ Complete (UI Implementation)

**Working Features**:
- Logout modal component
- Sidebar logout button
- Profile Settings logout button
- Modal open/close functionality
- Confirmation flow

**Ready for Backend**:
- API endpoint integration
- Token invalidation
- Session management
- Redirect logic
- State cleanup

---

## Usage Instructions

### For Developers

**To test logout flow**:
1. Run development server: `npm run dev`
2. Open application: http://localhost:5173
3. Click "Logout" button in sidebar
4. Confirm logout in modal

**To customize logout behavior**:
```typescript
// In App.tsx
<Sidebar 
  onLogout={() => {
    // Your custom logout logic here
    clearAuthToken();
    redirectToLogin();
  }}
/>
```

### For Users

**To logout from sidebar**:
1. Click "Logout" button at bottom of sidebar
2. Confirm in the dialog that appears
3. You will be logged out

**To sign out all devices**:
1. Go to Profile Settings
2. Scroll to "Session Information"
3. Click "Sign Out All Devices"
4. Confirm in the dialog
5. All active sessions will be terminated

---

## Conclusion

The logout feature is fully implemented with a professional confirmation modal, providing users with a secure and user-friendly way to end their session. The implementation follows best practices for UX and security, with clear visual feedback and confirmation steps to prevent accidental logouts.

The feature is ready for backend integration and can easily be extended with additional functionality like session management, device tracking, and auto-logout capabilities.

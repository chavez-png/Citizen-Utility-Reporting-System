# CUURS Frontend Documentation
## Unified Citizen Utility & Reporting System

---

## 📋 Project Overview

**CUURS** is a comprehensive web-based system that connects citizens with utility providers (REG for Electricity, WASAC for Water) to:
1. **Provide real-time utility status information** by location
2. **Enable rapid reporting** of infrastructure issues (water leaks, fallen poles, etc.)
3. **Send targeted SMS alerts** to affected citizens
4. **Track and manage** citizen reports and utility outages

---

## 🏗️ System Architecture

### Three Main User Roles:

#### 1. **Admin/Utility Operators** (REG/WASAC Staff)
- Manage utility outages
- Send targeted SMS alerts by location
- Review and respond to citizen reports
- Manage system users

#### 2. **Citizens**
- Report utility issues
- View live utility status by region
- Receive SMS alerts and updates
- Track their submitted reports

#### 3. **System Administrators**
- Overall system configuration
- User account management
- Integration settings (Africa's Talking SMS API)

---

## 📁 Frontend File Structure

```
project-root/
├── Admin Pages/
│   ├── dashboard.html          ← Admin Overview Dashboard
│   ├── admin-send-alert.html   ← Send SMS Alerts
│   ├── admin-outages.html      ← Manage Outages
│   ├── admin-view-reports.html ← Review Citizen Reports
│   ├── admin-users.html        ← User Management
│   └── admin-settings.html     ← System Configuration
│
├── Citizen Pages/
│   ├── citizen-portal.html     ← Citizen Home Page
│   ├── citizen-report-form.html ← Report Issue Form
│   ├── status-portal.html      ← Public Status Portal
│   └── citizen-portal.css      ← Citizen Pages Styling
│
├── Authentication/
│   ├── login_form.html         ← Login Page
│   └── registering_form.html   ← Registration Page
│
├── Stylesheets/
│   ├── dashboard.css           ← Admin Dashboard Styles
│   ├── admin-forms.css         ← Admin Forms & Tables
│   ├── citizen-portal.css      ← Citizen Pages Styles
│   └── base.css                ← Base Styles
│
└── Supporting Files/
    ├── activities.html, activities.css
    ├── messages.html, messages.css
    └── profile.html, profile.css
```

---

## 🎯 Key Pages & Features

### ADMIN DASHBOARD (`dashboard.html`)
**Overview page for utility company staff**
- **KPI Cards**: Active outages, pending reports, resolved issues, active citizens
- **Quick Actions**: Send SMS, Log outage, Review reports, Manage users
- **Recent Activity**: Timeline of system events
- **Service Status Grid**: Real-time status of all five Rwanda provinces

### SEND SMS ALERTS (`admin-send-alert.html`)
**Micro-targeted alert system**
- Location-based targeting (Province → District → Sector → Cell)
- Service type selection (Electricity/Water/Telecom)
- Issue categorization (Outage/Maintenance/Emergency)
- Message composition (160 character SMS limit)
- Recipient preview with estimated reach
- Integration with Africa's Talking SMS API

### MANAGE OUTAGES (`admin-outages.html`)
**Utility outage tracking system**
- Log new outages with location and timeline
- Filter by status (Active/Resolved) and service type
- Edit/delete outage records
- Track affected areas and estimated resolution time

### VIEW REPORTS (`admin-view-reports.html`)
**Citizen report management**
- Dashboard view of all submitted reports
- Filter by status, issue type, and priority
- View detailed report information with location details
- Update report status and add internal notes
- Track resolution progress

### USER MANAGEMENT (`admin-users.html`)
**Admin staff and citizen account management**
- **Admin Staff Tab**: Create/manage REG/WASAC operators
- **Citizens Tab**: Monitor registered citizen accounts
- Add new admin users with roles (Manager, Coordinator, Staff)
- Activate/deactivate accounts

### ADMIN SETTINGS (`admin-settings.html`)
**System configuration**
- **General Settings**: System name, contact info, URLs
- **SMS Integration**: Africa's Talking API credentials
- **Notifications**: Email/SMS alert preferences
- **Security**: Session timeout, password policies, 2FA

---

## 👤 CITIZEN PAGES

### CITIZEN PORTAL (`citizen-portal.html`)
**Citizen home page - entry point for all services**
- Welcome section with quick action buttons
- 6 feature cards (Report, Status, SMS, Track, Settings, Help)
- How CUURS works (4-step process explanation)
- FAQ section with expandable Q&A
- Emergency contact information

### REPORT ISSUE FORM (`citizen-report-form.html`)
**Comprehensive issue reporting interface**
- **Section 1**: Citizen contact info (name, phone, email)
- **Section 2**: Location details (Province/District/Sector/Cell + street address)
- **Section 3**: Issue details (service type, issue type, priority, description)
- **Section 4**: Evidence (photo & video uploads)
- **Section 5**: Agreement checkboxes & preferences
- Auto-generated Report ID for tracking
- Rwanda administrative hierarchy dropdown population

### PUBLIC STATUS PORTAL (`status-portal.html`)
**Real-time utility status viewer**
- View status for all 5 provinces (Kigali, Southern, Western, Northern, Eastern)
- Service status indicators:
  - ✅ Operational (green)
  - ⚠️ Partial Outage (yellow)
  - 🔴 Critical (red)
- Active alerts section showing current issues
- Filter by province, district, and service type
- Help section with emergency numbers

---

## 🎨 Design System

### Color Scheme
- **Primary**: `#1849a8` (Professional Blue)
- **Secondary**: `#0f3a7d` (Dark Blue)
- **Success**: `#4caf50` (Green)
- **Warning**: `#ff9800` (Orange)
- **Danger**: `#f44336` (Red)
- **Background**: `#f5f5f5` (Light Gray)

### Typography
- **Font**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Headings**: Bold, 16-32px
- **Body Text**: 14px regular

### Components
- **Navbar**: Sticky, gradient background, 80px height
- **Sidebar**: 250px fixed navigation (admin pages)
- **Cards**: White background, rounded corners, subtle shadows
- **Buttons**: Gradient blue, hover effects
- **Form Elements**: Full-width with focus states
- **Tables**: Striped rows, hover effects

---

## 📱 Rwanda Administrative Hierarchy

The system uses Rwanda's official administrative divisions:

```
COUNTRY: Rwanda
├── PROVINCES (5)
│   ├── Kigali City
│   │   ├── Gasabo District
│   │   │   ├── Kimihurura Sector
│   │   │   ├── Ndera Sector
│   │   │   └── Jali Sector
│   │   ├── Kicukiro District
│   │   └── Nyarugenge District
│   ├── Southern Province
│   ├── Western Province
│   ├── Northern Province
│   └── Eastern Province
```

**Complete administrative data is hardcoded** in dropdown selects on forms.

---

## 🔌 API Integration Points

### Africa's Talking Integration (Future Backend)
SMS alerts/updates will be sent via Africa's Talking API:
- **API Config**: Username, API Key, Sender ID
- **SMS Format**: 160 characters max
- **Target**: Specific phone numbers by location

### Expected Backend Endpoints (To Be Built)
- `POST /api/alerts/send` - Send SMS alert
- `POST /api/reports/submit` - Submit citizen report
- `GET /api/reports` - Fetch all reports
- `GET /api/outages` - Fetch utility outages
- `POST /api/outages/create` - Create new outage
- `GET /api/status/:region` - Get region status
- `POST /api/users` - Create admin user
- `GET /api/dashboard/stats` - Dashboard KPIs

---

## 🔐 Authentication Flow

**Current Status**: Frontend structure ready
- Login page validates credentials (currently localStorage-based)
- User type determines which dashboard loads
- Session stored in localStorage
- Logout clears session and redirects to login

**Backend Required For**:
- User authentication validation
- Role-based access control
- Secure session management
- API authentication

---

## 📊 Data Models for Backend

### AdminUser
```json
{
  "id": "int",
  "name": "string",
  "email": "string",
  "organization": "REG | WASAC | System",
  "role": "Manager | Coordinator | Staff",
  "province": "string",
  "createdAt": "datetime"
}
```

### CitizenReport
```json
{
  "id": "string (RPT-TIMESTAMP)",
  "citizenName": "string",
  "phoneNumber": "string",
  "serviceType": "electricity | water | telecom",
  "issueType": "string",
  "location": {
    "province": "string",
    "district": "string",
    "sector": "string",
    "cell": "string",
    "streetAddress": "string"
  },
  "priority": "high | medium | low",
  "description": "string",
  "affectedPeople": "int",
  "photos": "array of urls",
  "status": "pending | in-progress | resolved",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### UtilityOutage
```json
{
  "id": "int",
  "serviceType": "electricity | water | telecom",
  "location": {
    "province": "string",
    "district": "string"
  },
  "startTime": "datetime",
  "estimatedEndTime": "datetime",
  "actualEndTime": "datetime",
  "reason": "string",
  "status": "active | resolved",
  "createdAt": "datetime"
}
```

### SMSAlert
```json
{
  "id": "int",
  "targetProvince": "string",
  "targetDistrict": "string (optional)",
  "targetSector": "string (optional)",
  "recipientCount": "int",
  "service": "string",
  "subject": "string",
  "message": "string",
  "sentAt": "datetime",
  "sentVia": "africa-talking"
}
```

---

## 🚀 Next Steps - Backend Development

### 1. Database Setup
- PostgreSQL or MySQL
- Create tables for: Users, Reports, Outages, SMSAlerts, Statusupdates

### 2. Backend Framework
- Node.js + Express (Recommended)
- Python + Flask/Django
- Java + Spring Boot

### 3. Essential APIs
- User authentication (JWT/Sessions)
- CRUD operations for Reports & Outages
- SMS sending via Africa's Talking
- Real-time status updates

### 4. Database Connections
- Connect frontend forms to backend
- Implement data persistence
- Add validation & error handling

### 5. SMS Integration
- Integrate Africa's Talking API
- Implement SMS scheduling
- Create SMS templates for different scenarios

### 6. Additional Features
- Email notifications
- Real-time dashboards (WebSockets)
- Report tracking for citizens
- Analytics and reporting

---

## ✅ Frontend Checklist - COMPLETE

- ✅ Admin Dashboard Overview
- ✅ SMS Alert Sending
- ✅ Outage Management
- ✅ Report Viewing
- ✅ User Management
- ✅ System Settings
- ✅ Citizen Portal Home
- ✅ Issue Reporting Form
- ✅ Public Status Portal
- ✅ Responsive Design
- ✅ Navigation Structure
- ✅ CSS Styling System
- ✅ Form Validation (Client-side)

---

## 📝 Development Notes

### Current Technologies
- **HTML5**: Semantic markup
- **CSS3**: Flexbox, Grid, Gradients, Animations
- **JavaScript (Vanilla)**: No frameworks (ready for backend integration)
- **localStorage**: Temporary data storage (to be replaced by backend)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Optimizations
- Inline CSS animations
- Minimal JavaScript processing
- Responsive grid layouts
- Optimized images and icons

---

## 📞 Support & Contact

For issues or questions about the frontend:
1. Review the HTML comments in each file
2. Check the data structure in `<script>` sections
3. Refer to Rwanda's administrative divisions for location data
4. Validate form inputs before backend submission

---

**Version**: 1.0
**Date**: March 4, 2026
**Status**: Frontend Complete - Ready for Backend Integration
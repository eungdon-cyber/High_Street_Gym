# Bookings Export Feature - Structure Visualization

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                            │
│                      (BookingListView.jsx)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ User clicks "Export as XML"
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND EXPORT HANDLER                               │
│  handleExportPreviousBookingsXML()                                      │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ 1. Check authentication (localStorage.getItem("authKey"))       │     │
│  │ 2. Set loading state (setExportingXML(true))                  │     │
│  │ 3. Send GET request to /api/bookings/export/xml/history       │     │
│  │    Query: ?onlyPast=true                                       │     │
│  │    Header: x-auth-key: {authKey}                               │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP GET Request
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      API ROUTING LAYER                                    │
│  Route: GET /api/bookings/export/xml/history                             │
│  Middleware: APIAuthenticationController.restrict(["member", "admin"])   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Authenticated Request
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   BACKEND CONTROLLER LAYER                                │
│              (APIBookingController.mjs)                                  │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ exportBookingHistoryXML(req, res)                            │     │
│  │                                                                │     │
│  │ Step 1: Authentication Check                                  │     │
│  │   └─> Verify req.authenticatedUser                            │     │
│  │                                                                │     │
│  │ Step 2: Fetch Bookings                                        │     │
│  │   └─> BookingSessionActivityLocationUserModel                 │     │
│  │       .getByMemberId(memberId)                                │     │
│  │       Returns: bookings with session, activity,               │     │
│  │                 location, trainer details                    │     │
│  │                                                                │     │
│  │ Step 3: Filter Past Bookings                                 │     │
│  │   └─> if (onlyPast === 'true')                               │     │
│  │       Filter: sessionDate < currentDate                       │     │
│  │                                                                │     │
│  │ Step 4: Sort Chronologically                                 │     │
│  │   └─> Sort by: sessionDate + sessionTime                     │     │
│  │       Order: Ascending (oldest first)                        │     │
│  │                                                                │     │
│  │ Step 5: Generate XML                                          │     │
│  │   └─> generateBookingsXML(bookings, user)                     │     │
│  │                                                                │     │
│  │ Step 6: Create Filename                                       │     │
│  │   └─> booking-history-{FirstName}-{LastName}.xml             │     │
│  │                                                                │     │
│  │ Step 7: Export & Backup                                       │     │
│  │   └─> exportXML(res, xmlContent, filename)                   │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    XML GENERATION LAYER                                  │
│  generateBookingsXML(bookings, user)                                    │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ 1. Format Timestamp                                            │     │
│  │    └─> exported_at: YYYY-MM-DD HH:mm:ss                       │     │
│  │                                                                │     │
│  │ 2. Define DTD                                                  │     │
│  │    └─> Document Type Definition for validation                │     │
│  │                                                                │     │
│  │ 3. Group by Week                                               │     │
│  │    └─> getWeekRange(sessionDate)                               │     │
│  │        Groups: Monday to Sunday                                │     │
│  │                                                                │     │
│  │ 4. Sort Weeks Chronologically                                  │     │
│  │    └─> Sort by week start date                                │     │
│  │                                                                │     │
│  │ 5. Calculate Period                                            │     │
│  │    └─> period.start: First week's Monday                      │     │
│  │        period.end: Last week's Sunday                          │     │
│  │                                                                │     │
│  │ 6. Build XML Structure                                         │     │
│  │    └─> Header: title, exported_at, total_bookings,           │     │
│  │            period, member                                      │     │
│  │        Weeks: week elements with bookings                      │     │
│  │                                                                │     │
│  │ 7. Render Bookings                                            │     │
│  │    └─> For each booking:                                       │     │
│  │        - booking_date, booking_time, datetime                 │     │
│  │        - activity (name, description, id)                      │     │
│  │        - location (name, address, id)                          │     │
│  │        - trainer (name, email, id)                            │     │
│  │        - booking_id, session_id                                │     │
│  │                                                                │     │
│  │ 8. Escape XML Characters                                       │     │
│  │    └─> escapeXML() converts: &, <, >, ", '                   │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Calls
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    UTILITY LAYER                                         │
│              (backend/utils/xmlExport.mjs)                                │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ exportXML(res, xmlContent, filename)                          │     │
│  │                                                                │     │
│  │ 1. Backup to Local File System                                │     │
│  │    └─> Path: frontend/docs/{filename}                        │     │
│  │        Creates directory if missing                           │     │
│  │        Writes XML content to file                             │     │
│  │                                                                │     │
│  │ 2. Set Response Headers                                       │     │
│  │    └─> Content-Type: application/xml                          │     │
│  │        Content-Disposition: attachment; filename="..."      │     │
│  │                                                                │     │
│  │ 3. Send Response                                              │     │
│  │    └─> res.send(xmlContent)                                  │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                │         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ getWeekRange(dateString)                                      │     │
│  │                                                                │     │
│  │ 1. Parse Date                                                 │     │
│  │    └─> Convert string to Date object                          │     │
│  │                                                                │     │
│  │ 2. Calculate Monday                                           │     │
│  │    └─> Find Monday of the week containing date                │     │
│  │                                                                │     │
│  │ 3. Calculate Sunday                                           │     │
│  │    └─> Sunday = Monday + 6 days                              │     │
│  │                                                                │     │
│  │ 4. Format Dates                                               │     │
│  │    └─> ISO: YYYY-MM-DD                                        │     │
│  │        Display: DD/MM/YYYY                                     │     │
│  │                                                                │     │
│  │ 5. Return Object                                              │     │
│  │    └─> { key, startISO, endISO, label }                       │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Response
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND DOWNLOAD HANDLER                            │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │ 1. Receive XML Content                                        │     │
│  │    └─> await response.text()                                 │     │
│  │                                                                │     │
│  │ 2. Create Blob                                                │     │
│  │    └─> new Blob([xmlContent], { type: "application/xml" })   │     │
│  │                                                                │     │
│  │ 3. Extract Filename                                           │     │
│  │    └─> From Content-Disposition header                        │     │
│  │        Transform: booking-history- → previous-bookings-       │     │
│  │                                                                │     │
│  │ 4. Create Download Link                                        │     │
│  │    └─> Create <a> element                                    │     │
│  │        Set href to blob URL                                   │     │
│  │        Set download attribute                                 │     │
│  │                                                                │     │
│  │ 5. Trigger Download                                           │     │
│  │    └─> link.click()                                           │     │
│  │        Clean up: remove link, revoke URL                      │     │
│  │                                                                │     │
│  │ 6. Update UI State                                            │     │
│  │    └─> setExportingXML(false)                                 │     │
│  │        Clear any errors                                       │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          📥 XML File Downloaded
                          💾 Backup Saved to frontend/docs/
```

## 🔄 Data Flow Diagram

```
┌──────────────┐
│   Browser    │
│  (User UI)   │
└──────┬───────┘
       │
       │ 1. Click "Export as XML" button
       │    (Previous tab only)
       ▼
┌─────────────────────────────────────┐
│  BookingListView.jsx                │
│  ┌───────────────────────────────┐ │
│  │ handleExportPreviousBookingsXML│ │
│  │                                │ │
│  │ • Get authKey from localStorage│ │
│  │ • Set loading state            │ │
│  │ • Prepare fetch request        │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 2. HTTP GET Request
               │    GET /api/bookings/export/xml/history?onlyPast=true
               │    Headers: { "x-auth-key": "..." }
               ▼
┌─────────────────────────────────────┐
│  Express Router                     │
│  Route: /api/bookings/export/xml/   │
│         history                     │
│  Middleware: Authentication Check   │
└──────────────┬──────────────────────┘
               │
               │ 3. Authenticated Request
               ▼
┌─────────────────────────────────────┐
│  APIBookingController.mjs            │
│  ┌───────────────────────────────┐ │
│  │ exportBookingHistoryXML()     │ │
│  │                                │ │
│  │ 1. Verify authentication       │ │
│  │ 2. Fetch bookings from DB      │ │
│  │ 3. Filter past bookings        │ │
│  │ 4. Sort chronologically        │ │
│  │ 5. Generate XML               │ │
│  │ 6. Create filename             │ │
│  │ 7. Export & backup            │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 4. Call generateBookingsXML()
               ▼
┌─────────────────────────────────────┐
│  APIBookingController.mjs            │
│  ┌───────────────────────────────┐ │
│  │ generateBookingsXML()         │ │
│  │                                │ │
│  │ • Format timestamps            │ │
│  │ • Define DTD                    │ │
│  │ • Group by week                 │ │
│  │ • Sort weeks                    │ │
│  │ • Build XML structure           │ │
│  │ • Escape XML characters         │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 5. Call getWeekRange() (for each booking)
               ▼
┌─────────────────────────────────────┐
│  xmlExport.mjs                       │
│  ┌───────────────────────────────┐ │
│  │ getWeekRange()                │ │
│  │                                │ │
│  │ • Calculate Monday-Sunday     │ │
│  │ • Format dates                │ │
│  │ • Return week range object    │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 6. Return XML string
               ▼
┌─────────────────────────────────────┐
│  xmlExport.mjs                       │
│  ┌───────────────────────────────┐ │
│  │ exportXML()                   │ │
│  │                                │ │
│  │ 1. Backup to frontend/docs/   │ │
│  │ 2. Set response headers        │ │
│  │ 3. Send XML response           │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 7. HTTP Response
               │    Status: 200 OK
               │    Headers: Content-Type, Content-Disposition
               │    Body: XML content
               ▼
┌─────────────────────────────────────┐
│  BookingListView.jsx                │
│  ┌───────────────────────────────┐ │
│  │ handleExportPreviousBookingsXML│ │
│  │ (continued)                    │ │
│  │                                │ │
│  │ • Receive XML text             │ │
│  │ • Create Blob                  │ │
│  │ • Extract filename             │ │
│  │ • Create download link         │ │
│  │ • Trigger download            │ │
│  │ • Update UI state             │ │
│  └───────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               │ 8. File Download
               ▼
┌──────────────┐
│   Browser    │
│  Downloads   │
│  XML File    │
└──────────────┘
```

## 📁 File Structure

```
High_Street_Gym_React/
│
├── frontend/
│   ├── src/
│   │   └── bookings/
│   │       └── BookingListView.jsx          ← Export button & handler
│   │           └── handleExportPreviousBookingsXML()
│   │
│   └── docs/                                ← Backup location
│       └── booking-history-{Name}.xml       ← Auto-saved XML files
│
└── backend/
    ├── controllers/
    │   └── api/
    │       └── APIBookingController.mjs    ← Main export logic
    │           ├── exportBookingHistoryXML()
    │           ├── generateBookingsXML()
    │           └── escapeXML()
    │
    └── utils/
        └── xmlExport.mjs                    ← Shared utilities
            ├── exportXML()
            └── getWeekRange()
```

## 🔑 Key Functions & Responsibilities

### Frontend (BookingListView.jsx)

**`handleExportPreviousBookingsXML()`**
- **Purpose**: Orchestrates the export process from user interaction
- **Responsibilities**:
  - Authentication check
  - API request preparation
  - Response handling
  - File download trigger
  - Error handling
  - UI state management

### Backend (APIBookingController.mjs)

**`exportBookingHistoryXML(req, res)`**
- **Purpose**: Main export endpoint handler
- **Responsibilities**:
  - Authentication verification
  - Data fetching
  - Data filtering (past bookings)
  - Data sorting
  - XML generation orchestration
  - Filename creation
  - Export execution

**`generateBookingsXML(bookings, user)`**
- **Purpose**: Generate XML content from booking data
- **Responsibilities**:
  - Timestamp formatting
  - DTD definition
  - Week grouping
  - XML structure building
  - Data escaping
  - XML string generation

**`escapeXML(text)`**
- **Purpose**: Escape special XML characters
- **Responsibilities**:
  - Convert `&` → `&amp;`
  - Convert `<` → `&lt;`
  - Convert `>` → `&gt;`
  - Convert `"` → `&quot;`
  - Convert `'` → `&apos;`

### Utilities (xmlExport.mjs)

**`exportXML(res, xmlContent, filename)`**
- **Purpose**: Handle file export and backup
- **Responsibilities**:
  - Local file backup
  - Response header setting
  - XML response sending

**`getWeekRange(dateString)`**
- **Purpose**: Calculate week range (Monday-Sunday) for a date
- **Responsibilities**:
  - Date parsing
  - Monday calculation
  - Sunday calculation
  - Date formatting (ISO & display)
  - Week range object creation

## 📋 Process Steps

### Step 1: User Interaction
```
User on "Previous" tab
  ↓
Clicks "Export as XML" button
  ↓
handleExportPreviousBookingsXML() triggered
```

### Step 2: Authentication
```
Check localStorage for "authKey"
  ↓
If missing → Show error, stop
  ↓
If present → Continue
```

### Step 3: API Request
```
Prepare fetch request:
  - URL: /api/bookings/export/xml/history?onlyPast=true
  - Method: GET
  - Headers: { "x-auth-key": authKey }
  ↓
Send request
  ↓
Set loading state: exportingXML = true
```

### Step 4: Backend Processing
```
1. Authentication middleware validates API key
2. exportBookingHistoryXML() executes:
   a. Get member ID from authenticated user
   b. Fetch all bookings for member
   c. Filter past bookings (if onlyPast=true)
   d. Sort chronologically
   e. Generate XML
   f. Create filename
   g. Export & backup
```

### Step 5: XML Generation
```
generateBookingsXML():
  1. Format exported_at timestamp
  2. Define DTD structure
  3. Group bookings by week (Monday-Sunday)
  4. Sort weeks chronologically
  5. Calculate period (first Monday to last Sunday)
  6. Build XML header
  7. Render each booking with:
     - booking_date, booking_time, datetime
     - activity (name, description, id)
     - location (name, address, id)
     - trainer (name, email, id)
     - booking_id, session_id
  8. Escape XML special characters
  9. Return XML string
```

### Step 6: Export & Backup
```
exportXML():
  1. Backup XML to frontend/docs/{filename}
  2. Set response headers:
     - Content-Type: application/xml
     - Content-Disposition: attachment; filename="..."
  3. Send XML content in response
```

### Step 7: File Download
```
Frontend receives response:
  1. Extract XML text
  2. Create Blob from XML
  3. Extract filename from Content-Disposition header
  4. Create download link
  5. Trigger download
  6. Clean up (remove link, revoke URL)
  7. Update UI (set exportingXML = false)
```

## 🎯 XML Structure

```
<?xml version="1.0" encoding="UTF-8"?>
<!-- Copyright comment -->
<!DOCTYPE booking_history [DTD definition]>
<booking_history>
    <header>
        <title>Booking History - {Name}</title>
        <exported_at>YYYY-MM-DD HH:mm:ss</exported_at>
        <total_bookings>{count}</total_bookings>
        <period>
            <start>YYYY-MM-DD</start>
            <end>YYYY-MM-DD</end>
        </period>
        <member>
            <name>{FirstName LastName}</name>
            <email>{email}</email>
            <id>{userId}</id>
        </member>
    </header>
    <week start="YYYY-MM-DD" end="YYYY-MM-DD" period_label="DD/MM/YYYY - DD/MM/YYYY">
        <booking>
            <booking_date>YYYY-MM-DD</booking_date>
            <booking_time>HH:mm:ss</booking_time>
            <datetime>YYYY-MM-DDTHH:mm:ss</datetime>
            <activity>
                <name>{name}</name>
                <description>{description}</description>
                <id>{id}</id>
            </activity>
            <location>
                <name>{name}</name>
                <address>{address}</address>
                <id>{id}</id>
            </location>
            <trainer>
                <name>{FirstName LastName}</name>
                <email>{email}</email>
                <id>{id}</id>
            </trainer>
            <booking_id>booking_{id}</booking_id>
            <session_id>session_{id}</session_id>
        </booking>
        <!-- More bookings... -->
    </week>
    <!-- More weeks... -->
</booking_history>
```

## 🔐 Security Features

```
┌─────────────────────────────────────┐
│  Authentication Layer               │
│  ┌───────────────────────────────┐ │
│  │ API Key Validation             │ │
│  │ • Check x-auth-key header      │ │
│  │ • Verify key in database      │ │
│  │ • Load user from key           │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Authorization Layer                 │
│  ┌───────────────────────────────┐ │
│  │ Role-Based Access             │ │
│  │ • Members: own bookings only  │ │
│  │ • Admins: any member's        │ │
│  │ • Guests: denied              │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Data Protection                     │
│  ┌───────────────────────────────┐ │
│  │ XML Escaping                   │ │
│  │ • Prevents injection attacks   │ │
│  │ • Escapes special characters   │ │
│  │ • Ensures valid XML            │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 📊 State Management

```
Frontend State Variables:
├── exportingXML: boolean
│   └─> Controls loading spinner
│
├── exportError: string | null
│   └─> Stores error messages
│
└── activeTab: "active" | "previous"
    └─> Determines if export button is visible
```

## 🎨 UI Components

```
BookingListView.jsx
│
├── Tab Navigation
│   ├── "Active" tab
│   └── "Previous" tab ← Export button only here
│
├── Export Button (Previous tab only)
│   ├── Icon: FaDownload
│   ├── Text: "Export as XML" / "Exporting..."
│   ├── Disabled state during export
│   └── onClick: handleExportPreviousBookingsXML
│
└── Error Display
    └── Shows exportError if export fails
```

## 🔄 Error Handling Flow

```
┌─────────────────────────────────────┐
│  Error Scenarios                    │
│                                      │
│  1. No Authentication               │
│     └─> Show: "Authentication        │
│          required. Please log in."   │
│                                      │
│  2. API Request Fails                │
│     └─> Show: Error message from API │
│                                      │
│  3. Network Error                    │
│     └─> Show: Network error message  │
│                                      │
│  4. Invalid Response                 │
│     └─> Show: "Failed to export     │
│          previous bookings"         │
│                                      │
│  5. Backup Fails                     │
│     └─> Log error, continue export   │
│         (non-blocking)               │
└─────────────────────────────────────┘
```

## 📈 Performance Considerations

```
Optimizations:
├── Client-side filtering (onlyPast)
│   └─> Reduces data transfer
│
├── Efficient sorting
│   └─> Single pass chronological sort
│
├── Week grouping
│   └─> Organized data structure
│
└── Streaming response
    └─> XML sent directly, not buffered
```

---

**Last Updated**: 2024-12-02
**Version**: 1.0


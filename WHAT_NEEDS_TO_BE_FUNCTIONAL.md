# BKWB — What Needs to Be Functional

**System:** Barangay Kalunasan Water Billing System  
**Purpose:** Acceptance checklist. A feature is “done” only if a real user can complete it end to end, not just because a page exists.

There are four apps:

| App | Who uses it |
|---|---|
| Super Admin desktop | Super Admin |
| Staff desktop | Barangay Staff |
| Meter Reader mobile | Meter Reader |
| Resident mobile | Consumer / Resident |

---

## 1. Core flows (must work as a chain)

These are the two stories the system is built around. If either chain breaks, the system is not functional.

### 1.1 Meter reading → bill → payment

```text
Staff assigns a sitio to a meter reader
        ↓
Meter Reader records reading + photo
        ↓
Staff reviews (Approve or Reject)
        ↓
Staff generates bill from an approved reading
        ↓
Staff records payment
        ↓
Resident sees unpaid / paid status
```

**Must be true**

- Staff assigns **by sitio**, not one account at a time. All active accounts in that sitio get a reading assignment.
- Meter readers only see **their** assigned sitios and tickets.
- Submitted readings go to Staff as **Pending Review**. Meter readers cannot approve their own work.
- Current reading must be **greater than or equal to** the previous reading.
- Bills are created **from approved meter readings**, not typed in by hand.
- After a bill is generated, the reading status becomes **Billed**.
- Residents can **view** bills and payment history. They do **not** encode payments in the app. Staff records payment at the hall.
- Payment methods that must work: **Cash**, **GCash** (reference number), **Bank** (reference number).

### 1.2 Service tickets

```text
Resident files a ticket
        ↓
Staff assigns it to a Meter Reader (or Staff)
        ↓
Meter Reader taps Ongoing
        ↓
Meter Reader taps Work Completed
        ↓
Resident confirms: Yes, Completed  →  Resolved
             or: Not Yet           →  back to Ongoing
```

**Must be true**

- Ticket number is generated (example: `TKT-YYYY-000001`).
- Meter reader **cannot** mark a ticket Resolved. The resident must confirm.
- Staff can still resolve a ticket directly if needed.

---

## 2. Status labels that must mean what they say

### Meter reading

| Status | Meaning |
|---|---|
| Assigned | Waiting for the meter reader |
| Pending Review | Submitted; staff must approve or reject |
| Approved | Accepted; ready to generate a bill |
| Rejected | Sent back (reason required) |
| Billed | A bill was generated from this reading |

### Bill

| Status | Meaning |
|---|---|
| Unpaid / Pending | Amount is still due |
| Overdue | Past due date |
| Paid | Payment recorded |
| Void | Cancelled |

### Ticket

| Status | Meaning |
|---|---|
| Open | Newly reported |
| Assigned | Given to Staff or a Meter Reader |
| Scheduled | Visit is scheduled |
| Ongoing | Work has started |
| Work Completed | Meter reader finished; resident must confirm |
| Resolved | Resident confirmed, or staff resolved |
| Closed | Closed |

---

## 3. Super Admin — must work

- [ ] Login and logout
- [ ] Dashboard KPIs / overview
- [ ] **User Management:** list users, filter by role (Super Admin, Staff, Meter Reader, Resident)
- [ ] **Create Staff** and **Create Meter Reader** accounts (name, email, role, password) and show credentials after save
- [ ] Super Admin does **not** create residents; Staff does
- [ ] **System Settings:** General, System, Security, Billing (water rate, penalty, grace period used when generating bills)
- [ ] **Analytics:** operational charts
- [ ] **Audit Logs:** search, filters, recent activity
- [ ] Optional operational view of Staff modules (Residents, Meter Readings, Bills, Payments, Announcements, Tickets, Reports) without repeating the full Staff workflow

---

## 4. Staff — must work

### 4.1 Login and dashboard

- [ ] Login and logout
- [ ] Dashboard cards: residents, bills, pending payments, revenue

### 4.2 Residents

- [ ] Residents page shows **only resident accounts** (no staff, meter readers, or super admins)
- [ ] **Add Resident** actually creates the account (not a failed Edge Function call)
- [ ] Required fields: first / middle / last name, **date of birth**, cell number (valid PH format), service address, **sitio**, meter number, previous / current reading
- [ ] Email is optional
- [ ] Account number is generated automatically
- [ ] Temporary password follows `LastNameFirstNameMMDDYYYY` from the birthday
- [ ] Sitio is saved and shown in the residents table
- [ ] **Issue Login** works for migrated / no-login residents (temporary credentials so they can open the mobile app with Account Number)
- [ ] Resident overview: Resident Information, Meter Information, Billing History, Payment History

### 4.3 Meter readings

- [ ] Status cards: Assigned, Pending Review, Approved, Rejected
- [ ] Assign meter readings by sitio + meter reader + date
- [ ] Cannot assign a sitio that is already assigned for that cycle
- [ ] Review submitted reading: photo, previous reading, current reading, consumption
- [ ] **Approve** → status Approved
- [ ] **Reject** → reason required → status Rejected
- [ ] **Generate Bill** from approved reading → bill number; reading becomes Billed

### 4.4 Bills and payments

- [ ] Bills list with Unpaid, Overdue, Paid
- [ ] Bill detail: bill number, account, period, consumption, amount due, due date
- [ ] Configure bills / rates when needed
- [ ] Record payment against unpaid bill(s)
- [ ] Cash: amount received and change due
- [ ] GCash / Bank: reference number required
- [ ] Receipt: reference number, amount, paid bills (print / download if implemented)

### 4.5 Tickets

- [ ] Ticket Management: see Open tickets
- [ ] Assign to Meter Reader or Staff → status Assigned
- [ ] Staff can also create a ticket for a resident

### 4.6 Announcements

- [ ] Create announcement: category, priority, title, body, audience (Residents / Meter Readers / All)
- [ ] Optional **schedule** (future publish date)
- [ ] Optional **expiration**
- [ ] Published announcement appears on Resident and/or Meter Reader apps for the chosen audience

### 4.7 Reports, notifications, profile

- [ ] Reports: Residents / Meter Readings / Water Consumption / Bills / Payments / Tickets
- [ ] Period: Monthly / Quarterly / Yearly
- [ ] Generate summary + table
- [ ] Export CSV or PDF
- [ ] Notifications: unread list, open related record
- [ ] Profile / settings
- [ ] Logout with confirm

---

## 5. Meter Reader mobile — must work

- [ ] Login and logout
- [ ] Dashboard: greeting, assigned count, completed count, announcements
- [ ] Notifications (bell / unread)
- [ ] **Assigned:** sitios grouped with progress %
- [ ] Start reading / pick consumer: resident info, previous reading
- [ ] Capture meter photo
- [ ] Enter current reading (≥ previous)
- [ ] Optional notes
- [ ] Submit → sitio progress increases; status becomes Pending Review
- [ ] History of submitted readings
- [ ] Tickets: Active filter, tap Ongoing, tap Work Completed with a completion note
- [ ] Announcements
- [ ] Profile
- [ ] Forgot password

---

## 6. Resident mobile — must work

### 6.1 First login / account setup (new or issued-login accounts)

- [ ] Login with **Account Number + temporary password**
- [ ] Setup wizard: Email → OTP (6-digit) → permanent password → confirm profile → done
- [ ] After setup, resident can still sign in with **Account Number** (or email) + new password
- [ ] Temporary password is no longer valid after the permanent password is set

### 6.2 Day-to-day

- [ ] Dashboard greeting and current bill amount
- [ ] View current bill and billing history
- [ ] View payment history (read-only; no in-app payment encoding)
- [ ] Announcements (priority badges + detail)
- [ ] Water schedule
- [ ] Chatbot: ask a sample question and get a response
- [ ] Notifications: unread badge, mark as read
- [ ] Profile: name, account number, contact details
- [ ] Forgot password
- [ ] Create ticket (category, priority, subject, description) → ticket number, status Open
- [ ] Confirm work on a ticket: **Yes, Completed** → Resolved, or **Not Yet** → Ongoing

---

## 7. Shared requirements (all four apps)

- [ ] **Forgot password** works on Super Admin, Staff, Resident, and Meter Reader
- [ ] Cell number validation (required format / PH prefix)
- [ ] Role-based access: each role only sees what it is allowed to see (UI **and** backend)
- [ ] Notifications fire for the events users actually care about (new assignment, reading submitted, bill generated, ticket updates, announcements)
- [ ] Audit logs record important actions (login/logout, user create, readings, bills, payments, tickets, settings)

---

## 8. What does **not** need to be functional

Do not treat these as blockers for “the system works”:

- Online payment gateway (PayMongo, GCash API, bank API). Staff records payment at the hall.
- Residents paying inside the mobile app.
- Dark mode, multi-language, predictive billing, or other extras.

---

## 9. Minimum demo path (if time is short)

If only one pass can be proven, complete this in order:

1. Super Admin creates a Meter Reader (or use an existing one).
2. Staff adds a test resident in a test sitio (or uses an existing test account).
3. Staff issues login if the resident has no login yet.
4. Staff assigns that sitio to the meter reader.
5. Meter Reader submits a reading with a photo.
6. Staff approves the reading and generates a bill.
7. Staff records a **Cash** payment.
8. Resident logs in (setup if new) and sees the paid / unpaid bill.
9. Resident creates a ticket → Staff assigns → Meter Reader Ongoing → Work Completed → Resident confirms Resolved.
10. Staff publishes an announcement; Resident or Meter Reader sees it.

If that path works, the system is functionally complete for defense and recording.

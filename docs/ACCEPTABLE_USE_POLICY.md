# Acceptable Use Policy

**Barangay Kalunasan Water Billing System (BKWBS)**

| Field | Details |
| --- | --- |
| Document Title | Acceptable Use Policy (AUP) |
| System | Barangay Kalunasan Water Billing System (BKWBS) |
| Version | 1.0 |
| Classification | Internal / Official Use |
| Related Laws | RA 10173 (Data Privacy Act of 2012); RA 10175 (Cybercrime Prevention Act of 2012) |
| Security Framework | CIA Triad — Confidentiality, Integrity, Availability |

---

## 1. Purpose

The Acceptable Use Policy (AUP) defines the rules and guidelines for accessing, managing, and utilizing the Barangay Kalunasan Water Billing System (BKWBS). Its goal is to safeguard data privacy, protect municipal digital infrastructure, ensure operational continuity, and enforce compliance with the Philippine Data Privacy Act of 2012 (RA 10173) and the Cybercrime Prevention Act of 2012 (RA 10175).

This policy is grounded in the **CIA triad**, the standard information-security model used to protect BKWBS:

- **Confidentiality** — resident personal data, billing records, login credentials, and role-restricted system functions shall be accessible only to authorized users.
- **Integrity** — meter readings, tariff rates, payment receipts, tickets, and audit logs shall remain accurate, complete, and unaltered except through approved workflows.
- **Availability** — authorized users shall be able to access BKWBS when needed to issue bills, collect payments, record readings, and resolve service concerns, without unauthorized disruption.

Every allowed use, prohibited use, and consequence in this AUP is mapped to one or more CIA pillars in **Section 3**.

---

## 2. Scope

This policy applies to all authorized users of Barangay Kalunasan Water Billing System (BKWBS), including Super Admins, Barangay Staff, Meter Readers, and Residents accessing the web, desktop, and mobile app platforms.

It covers:

- user accounts, passwords, session tokens, and authentication codes;
- resident personal information and water-service accounts;
- meter readings, dial photos, billing statements, payments, and electronic receipts;
- support tickets, announcements, reports, audit logs, and system configurations;
- barangay-issued or personally owned devices used to access BKWBS.

---

## 3. CIA Triad Linkage

The CIA triad is the security foundation of BKWBS. The table below links each policy control to the pillar it protects. A rule may support more than one pillar.

### 3.1 CIA definitions in BKWBS

| CIA Pillar | Meaning in BKWBS | What it protects | Primary legal basis |
| --- | --- | --- | --- |
| **Confidentiality** | Only authorized roles may view or handle resident and operational data. | Names, addresses, contact numbers, account credentials, billing histories, payment records, and role-restricted dashboards | RA 10173 — unauthorized processing or disclosure of personal information |
| **Integrity** | Records must be accurate, complete, and changed only through approved workflows. | Meter readings, dial photos, tariff slabs, generated bills, official receipts, ticket statuses, and immutable audit logs | RA 10175 — computer-related forgery, fraud, and illegal alteration of data; RA 10173 — inaccurate processing of personal data |
| **Availability** | The system and its records must remain usable for official barangay operations. | Login access, billing and payment processing, meter-reading uploads, ticket handling, and scheduled maintenance | Operational continuity of a public utility service; RA 10175 — system interference |

### 3.2 How allowed uses support the CIA triad

| Role | Allowed use | CIA pillar(s) | Why it is linked |
| --- | --- | --- | --- |
| Barangay Staff | Creating and registering new resident accounts | **Confidentiality**, **Integrity** | Accounts are created only by authorized staff, with complete and accurate resident records. |
| Barangay Staff | Editing and configuring the water billing price structure (tariff rates and slabs) | **Integrity**, **Availability** | Correct official rates keep bills accurate and keep billing operations running. |
| Barangay Staff | Uploading consumption logs | **Integrity**, **Availability** | Verified consumption data is required to generate bills on schedule. |
| Barangay Staff | Generating billing statements | **Integrity**, **Availability** | Residents receive complete, timely, and correct bills. |
| Barangay Staff | Processing payments and issuing electronic receipts | **Integrity**, **Confidentiality** | Payment records and receipts must be authentic, and payment data must stay within authorized channels. |
| Barangay Staff | Updating support ticket statuses | **Integrity**, **Availability** | Ticket records stay accurate so service concerns can be resolved without delay. |
| Super Admin | Managing Role-Based Access Controls (RBAC) | **Confidentiality**, **Integrity** | Users receive only the privileges their role requires, reducing unauthorized viewing or alteration of data. |
| Super Admin | Auditing system logs | **Integrity**, **Confidentiality** | Immutable logs detect unauthorized access and unauthorized changes. |
| Super Admin | Managing core system configurations | **Integrity**, **Availability** | Approved configuration changes keep the system secure and operational. |
| Super Admin | Executing scheduled system maintenance or updates | **Availability**, **Integrity** | Planned maintenance preserves uptime and prevents unpatched weaknesses. |
| Meter Reader | Recording and uploading monthly water meter readings and dial photos | **Integrity**, **Availability** | Photo-backed readings keep consumption data accurate and bills issuable on time. |
| Meter Reader | Logging physical meter anomalies | **Integrity**, **Availability** | Faulty or tampered meters are flagged before they distort bills or interrupt service. |
| Residents | Accessing monthly billing statements and consumption history | **Confidentiality**, **Availability** | Each resident may view only their own records, and those records must remain accessible. |
| Residents | Making utility payments | **Integrity**, **Availability** | Payments must post correctly and the payment channel must remain usable. |
| Residents | Updating personal information | **Integrity**, **Confidentiality** | Residents keep their own data current without exposing other residents' records. |
| Residents | Creating support tickets | **Availability**, **Integrity** | Service concerns can be filed and tracked as complete, unaltered records. |

### 3.3 How prohibited uses violate the CIA triad

| Prohibited use | CIA pillar(s) violated | How the violation occurs | Related law |
| --- | --- | --- | --- |
| Credential sharing (accounts, passwords, session tokens, or two-factor codes) | **Confidentiality**, **Integrity**, **Availability** | An unauthorized person may view private data, change records under another user's identity, or lock out the rightful user. | RA 10173; RA 10175 (illegal access) |
| Unauthorized data extraction (downloads, copies, exports, or database dumps to personal storage, unapproved cloud drives, or personal email) | **Confidentiality** | Resident personal data and billing histories leave authorized BKWBS controls. | RA 10173 (unauthorized processing / disclosure) |
| Data tampering and unapproved adjustments (altering readings, overriding tariffs without authorization, altering receipts, or editing audit history) | **Integrity** | Official billing, payment, and audit evidence is falsified or destroyed. | RA 10175 (computer-related forgery / fraud); RA 10173 |
| Circumventing RBAC or accessing another role's modules | **Confidentiality**, **Integrity** | Users gain privileges they were not assigned and may view or change data outside their duty. | RA 10173; RA 10175 (illegal access) |
| Disrupting, disabling, or overloading BKWBS, or performing unapproved shutdowns | **Availability** | Staff, meter readers, and residents cannot bill, collect, read meters, or file tickets. | RA 10175 (system interference) |

### 3.4 CIA-to-control summary

| CIA pillar | Policy controls that protect it |
| --- | --- |
| **Confidentiality** | Unique logins; no credential sharing; RBAC; residents may access only their own records; no unauthorized export of personal or billing data; Super Admin audit of access logs |
| **Integrity** | Photo-backed meter readings; approved workflows for tariff, bill, payment, and ticket changes; prohibition on receipt and audit-log alteration; Super Admin log review |
| **Availability** | Role-based operational duties; scheduled Super Admin maintenance; prohibition on system disruption; prompt ticket handling; continued access to bills, payments, and readings |

---

## 4. Allowed Uses

Users may use BKWBS only for official barangay water-billing and service functions assigned to their role.

### 4.1 Barangay Staff

Creating and registering new resident accounts, editing and configuring the water billing price structure (tariff rates and slabs), uploading consumption logs, generating billing statements, processing payments, issuing electronic receipts, and updating support ticket statuses.

**CIA linkage:** Staff duties protect **Confidentiality** by keeping resident registration inside authorized channels, **Integrity** by producing accurate bills, rates, payments, and tickets, and **Availability** by keeping billing and support operations running.

### 4.2 Super Admin

Managing Role-Based Access Controls (RBAC), auditing system logs, managing core system configurations, and executing scheduled system maintenance or updates.

**CIA linkage:** Super Admin duties protect **Confidentiality** through RBAC and access audits, **Integrity** through configuration control and immutable logs, and **Availability** through scheduled maintenance.

### 4.3 Meter Reader

Recording and uploading monthly water meter readings and dial photos in the field via the mobile app, and logging physical meter anomalies.

**CIA linkage:** Meter Reader duties protect **Integrity** of consumption data and **Availability** of the monthly billing cycle.

### 4.4 Residents

Accessing monthly billing statements, reviewing consumption history, making utility payments, updating personal information, and creating tickets.

**CIA linkage:** Resident duties protect **Confidentiality** of personal accounts, **Integrity** of self-updated profile data and payment records, and **Availability** of billing, payment, and support services.

---

## 5. Prohibited Uses

The following acts are strictly prohibited. Each prohibition exists to protect one or more CIA pillars.

### 5.1 Credential Sharing — Confidentiality, Integrity, Availability

Sharing system login accounts, passwords, session tokens, or two-factor authentication codes with unauthorized individuals or co-workers.

### 5.2 Unauthorized Data Extraction — Confidentiality

Downloading, copying, or exporting resident personal records, billing histories, or full database dumps to unauthorized personal storage devices, unapproved cloud drives, or personal email accounts.

### 5.3 Data Tampering and Unapproved Adjustments — Integrity

Manually altering water meter readings, overriding price structures without administrative authorization, altering official payment receipts, or editing audit log history outside approved workflows.

### 5.4 Unauthorized Privilege Use — Confidentiality, Integrity

Accessing modules, accounts, or records outside the user's assigned role, bypassing RBAC, or using another person's session.

### 5.5 System Disruption — Availability

Intentionally disrupting, disabling, overloading, or shutting down BKWBS, or interfering with scheduled maintenance, so that authorized users cannot access billing, payment, meter-reading, or ticketing functions.

---

## 6. User Responsibilities

All users shall:

1. Use only the account issued to them and keep credentials confidential. (**Confidentiality**)
2. Enter complete and truthful information, including meter readings, payments, and profile updates. (**Integrity**)
3. Report lost devices, suspected account compromise, inaccurate records, or system outages immediately to Barangay Staff or Super Admin. (**Confidentiality**, **Integrity**, **Availability**)
4. Log out of shared or unattended devices after use. (**Confidentiality**)
5. Use BKWBS only for official water-billing and service purposes. (**Availability**)

---

## 7. Monitoring and Enforcement

BKWBS maintains audit logs of authentication events and significant data changes. Super Admins may review these logs to detect unauthorized access, unauthorized alteration, and service disruption.

Users have no expectation of privacy in official BKWBS activity logs. Monitoring is performed to protect the CIA triad and to support compliance with RA 10173 and RA 10175.

---

## 8. Consequences of Non-Compliance

Violation of this AUP is a violation of the CIA triad and may result in:

1. **Formal reprimand, suspension, or termination** of employment or system roles for Barangay Staff and Meter Readers.
2. **Account restriction or revocation** for any user, including Residents and Super Admins, where continued access would threaten confidentiality, integrity, or availability of BKWBS.
3. **Referral to law enforcement authorities** for civil or criminal prosecution under RA 10173 (Data Privacy Act) and RA 10175 (Cybercrime Prevention Act).

| Violation type | CIA impact | Typical consequence |
| --- | --- | --- |
| Credential sharing or unauthorized access | Confidentiality (and possibly Integrity / Availability) | Reprimand, role suspension, account revocation, possible prosecution under RA 10173 / RA 10175 |
| Unauthorized export of resident or billing data | Confidentiality | Termination of role/access and referral under RA 10173 |
| Tampering with readings, tariffs, receipts, or audit logs | Integrity | Termination of role/access and referral under RA 10175 |
| Unauthorized system disruption | Availability | Suspension or revocation of access and referral under RA 10175 |

---

## 9. Policy Review

This AUP shall be reviewed at least annually, or sooner after a security incident, a major system update, or a change in applicable law. Users shall be required to re-acknowledge the policy after a material revision.

---

## 10. Acknowledgement Form

All authorized users must sign this form **before** receiving BKWBS access, and again after any material revision of this policy. A signed copy shall be retained by the Super Admin / Barangay records custodian.

No account shall be activated until this acknowledgement is completed.

---

### Barangay Kalunasan Water Billing System (BKWBS)
### Acceptable Use Policy — User Acknowledgement

I acknowledge that I have received, read, and understood the **Acceptable Use Policy** of the Barangay Kalunasan Water Billing System (BKWBS).

I understand that BKWBS is protected under the **CIA triad**:

- **Confidentiality** — I will not share my credentials or disclose resident, billing, or system data to unauthorized persons.
- **Integrity** — I will not alter meter readings, tariff rates, receipts, tickets, or audit logs except through approved workflows.
- **Availability** — I will not disrupt BKWBS or prevent authorized users from performing official duties.

I agree to use BKWBS only for authorized purposes consistent with my assigned role. I understand that violation of this policy may result in reprimand, suspension, termination of employment or system role, account revocation, and referral to law enforcement under **RA 10173 (Data Privacy Act of 2012)** and **RA 10175 (Cybercrime Prevention Act of 2012)**.

I have had the opportunity to ask questions about this policy, and I accept responsibility for my use of BKWBS.

| Field | User entry |
| --- | --- |
| Full Name (print) | ________________________________ |
| Role *(check one)* | ☐ Super Admin ☐ Barangay Staff ☐ Meter Reader ☐ Resident |
| BKWBS Username / Email | ________________________________ |
| Office / Household Address | ________________________________ |
| Contact Number | ________________________________ |
| Date Signed | ________________________________ |
| User Signature | ________________________________ |

**Declarations** *(user must initial each line)*

| Initials | Statement |
| --- | --- |
| ______ | I will not share my password, session token, or authentication codes. |
| ______ | I will not download or send BKWBS data to personal storage, unapproved cloud drives, or personal email. |
| ______ | I will not tamper with readings, tariffs, receipts, or audit logs. |
| ______ | I will report suspected security incidents, data errors, or system outages immediately. |
| ______ | I understand the consequences of non-compliance, including possible legal action. |

---

### Witness / Issuing Authority *(required for Super Admin, Barangay Staff, and Meter Reader; optional for Residents)*

| Field | Entry |
| --- | --- |
| Name of Witness | ________________________________ |
| Position | ☐ Super Admin ☐ Barangay Official ☐ Authorized Custodian |
| Date | ________________________________ |
| Signature | ________________________________ |

---

**For records use only**

| Field | Entry |
| --- | --- |
| Acknowledgement Control No. | ________________________________ |
| Account activated by | ________________________________ |
| Date of account activation | ________________________________ |
| Next acknowledgement due | ________________________________ |
| Filed in | ☐ Personnel file ☐ User access folder ☐ Digital scan archive |

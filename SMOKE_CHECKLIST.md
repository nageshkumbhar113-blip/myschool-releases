# Manual Smoke Checklist

Date: 2026-04-05

Use this checklist after major changes before shipping a build.

## Verified Automatically

- `npm run build` -> Pass
- `npm run test:license` -> Pass

## Critical Flows

### 1. License Activate
- Open school app on fresh browser profile.
- Confirm `Device ID` / binding code is visible.
- Paste a newly generated signed license.
- Expected:
  - License activates successfully.
  - Dashboard opens.
  - Invalid / old / wrong-device key fails.
- Current status:
  - Code path verified.
  - License smoke tests passed.
  - Manual browser run still recommended.

### 2. Super Admin Generate License
- Open `/super-admin/login`.
- Log in.
- Create or update an institute.
- Open `Generate License`.
- Generate using:
  - `Use This PC`
  - `Use School Binding Code`
- Expected:
  - Signed key is generated.
  - Wrong device code is rejected.
  - Institute billing/license metadata saves correctly.
- Current status:
  - Code path verified.
  - Manual browser run recommended.

### 3. Add / Edit Student
- Open `Add Student`.
- Fill required fields.
- Save student.
- Open student detail.
- Click `Edit`.
- Change profile and fee values.
- Save again.
- Expected:
  - Student saves.
  - Edit form pre-fills existing values.
  - Updated values reflect in detail page.
- Current status:
  - Build verified.
  - Code path verified.
  - Manual browser run recommended.

### 4. Admission Print
- From student detail, click `Admission Form`.
- Preview should open.
- Use `Print / Save PDF`.
- Expected:
  - Selected admission fields appear.
  - Photo, academic, fee details render correctly.
  - Print dialog opens.
- Current status:
  - Code path verified.
  - Manual browser print verification required.

### 5. Bonafide Print
- From student detail, click `Generate Bonafide`.
- If values are missing, modal should ask for them.
- Fill missing values and continue.
- Print / save PDF.
- Expected:
  - Existing student/settings data auto-fills.
  - Missing data can be typed manually.
  - `Studying Since` falls back to `Date of Admission`.
- Current status:
  - Code path verified.
  - Manual browser print verification required.

### 6. LC Print
- From student detail, click `Generate LC`.
- If values are missing, modal should ask for them.
- Fill missing values and continue.
- Print / save PDF.
- Expected:
  - Existing student/settings data auto-fills.
  - Missing values like `Result`, `Leaving Date`, `Reason for Leaving` can be typed manually.
  - Final preview uses typed values.
- Current status:
  - Code path verified.
  - Manual browser print verification required.

### 7. Fee Receipt
- Collect a fee installment.
- Open `Receipts`.
- Preview receipt.
- Download or print/save as PDF.
- Expected:
  - Receipt number created.
  - Totals correct.
  - Template receipt flow works when active template exists.
- Current status:
  - Code path verified.
  - Manual browser run recommended.

### 8. Backup / Restore
- Export backup.
- Try restore into same institute and fresh setup.
- Try restore when student count would exceed license limit.
- Expected:
  - Export works.
  - Restore works when valid.
  - Restore blocks on student limit exceed.
  - `license_data` is not exported/imported.
- Current status:
  - Code path verified.
  - Manual restore run recommended.

### 9. Student Limit Block
- Use institute with small `maxStudents`.
- Add students up to limit.
- Try one more add.
- Try promotion / restore beyond limit.
- Expected:
  - Add blocked.
  - Promotion blocked.
  - Restore blocked.
- Current status:
  - Code path verified.
  - Manual browser run recommended.

## Release Readiness

Current confidence level: high for build + core code paths, but not 100% confirmed without full manual browser pass of the 9 flows above.

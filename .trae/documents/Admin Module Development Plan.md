# Admin Module Implementation Plan

## 1. Database Schema Updates
- **User Model**: Add `employeeId` (Int/String, unique) for teachers.
- **Resource Model**: Add `status` (String: "NORMAL", "VIOLATION", "PENDING").
- **Question/Answer Model**: Add fields or values to support "VIOLATION" status and "HIDDEN/TOP" flags.
- **AdminLog Model**: Create new table to record admin operations (operator, action, target, timestamp).

## 2. Backend Implementation (Go)
- **Models**: Update Go structs in `internal/models` to match the new schema.
- **Admin Controller**:
  - Implement `TeacherController`: CRUD for teachers (with password encryption).
  - Implement `AuditController`:
    - Resources: List (filter by status), Update (status/desc), Delete.
    - Q&A: List (filter by status), Update (status/top/hide), Delete.
  - Implement `AdminLog`: Middleware/Helper to record actions.
- **Routes**: Register new endpoints under `/api/admin` with `RequireAdmin` middleware.

## 3. Frontend Implementation (React)
- **Shared Components**: Extract `ResourceCard` and `QuestionItem` from student pages if not already separated, to ensure UI consistency.
- **Teacher Management**:
  - Create `pages/admin/TeacherManager.tsx`.
  - Implement Table view with "Add", "Edit", "Delete" actions.
  - Create `TeacherModal` for Add/Edit forms (validations: password strength, unique fields).
- **Content Audit**:
  - Create `pages/admin/ContentAudit.tsx` with tabs for "Resources" and "Q&A".
  - **Resource Audit**: Reuse resource list UI, add "Audit" buttons (Pass, Reject/Delete, Edit).
  - **Q&A Audit**: Reuse Q&A list UI, add "Audit" buttons (Hide, Top, Delete).
- **Sidebar**: Update `Sidebar.tsx` to include new Admin menu items.
- **API Service**: Update `services/api.ts` (or `adminApi.ts`) to call the new Go endpoints.

## 4. Integration & Testing
- **Verification**:
  - Verify Teacher CRUD updates in DB and can login.
  - Verify Audit actions change status and are recorded in `AdminLog`.
  - Check UI responsiveness and consistency with Student view.

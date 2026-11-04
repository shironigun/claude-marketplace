# Import customers from a CSV file: functional requirements

Version 0.3, draft for review. This is a synthetic document for testing; it describes no real product.

## 1 Purpose and scope

### 1.1 Purpose

Admins import customers from a CSV file instead of entering them one by one. Sales teams often receive customer lists from events and partners, and typing hundreds of records by hand is slow and error prone.

### 1.2 Goals

- An admin can import a list of up to several thousand customers in one go.
- Rows that cannot be imported are reported with a reason, so the admin can fix them and try again.
- Nothing is imported until the admin has seen a preview and confirmed it.

### 1.3 In scope

- Uploading one CSV file at a time from the Customers page.
- Mapping the file's columns to customer fields.
- Validating every row before anything is written.
- A preview, the import itself, a summary and a downloadable error report.

### 1.4 Out of scope

- Importing from Excel files or from other systems through an API.
- Updating customers in bulk by any other means.
- Scheduled or recurring imports.

## 2 Users and permissions

Only admins can import customers. The Import button is shown on the Customers page to admins only.

An admin can see the imports they started and their error reports.

## 3 Uploading a file

### 3.1 Choosing a file

The admin opens the Customers page, selects Import and chooses a file from their computer, or drags the file onto the upload area.

Files must be CSV files encoded in UTF-8. A comma separates the values, and a value that contains a comma is wrapped in double quotes.

### 3.2 Limits

Files are limited to 10,000 rows.

The maximum file size is 5 MB.

A file over either limit is rejected before it is uploaded, with a message that names the limit.

Large files should import quickly.

### 3.3 Progress

While the file uploads, the page shows a progress bar with the percentage sent.

## 4 Mapping columns

### 4.1 Headers

The first row of the file holds the column headers. The importer reads the headers and suggests a customer field for each one by its name.

### 4.2 Accepted columns

The accepted columns are Email, Name, Phone, Company, Date of birth, etc.

Each customer field can be mapped to at most one column. A column the admin does not map is ignored.

### 4.3 Saving a mapping

The admin can save a mapping and choose it again for the next import from the same source.

## 5 Validating rows

### 5.1 Required fields

The email column is required.

Name is required.

### 5.2 Formats

Every email must be a valid email address.

Phone numbers contain digits only; spaces and dashes are removed before the check.

The importer accepts common date formats.

### 5.3 Field rules

| Column | Required | Rule |
|---|---|---|
| Email | yes | must be a valid email address |
| Name | yes | at most 120 characters |
| Phone | no | digits only after spaces and dashes are removed |
| Company | no | at most 200 characters |
| Date of birth | no | a date in the past |

### 5.4 Rejected rows

A row that fails validation is not imported. It is listed in the error report with its row number, the column and the reason.

Error messages must be user-friendly.

## 6 Duplicates

Rows whose email matches an existing customer are skipped.

When two rows in the same file have the same email, the first row is imported and the later rows are reported as duplicates.

## 7 Preview

Before anything is imported, the admin sees a preview of the first 20 rows, each with its validation result.

The preview also shows how many rows will be imported, skipped and rejected.

The admin can cancel at the preview. Nothing is imported after a cancel.

## 8 Importing

### 8.1 Running the import

When the admin confirms the preview, the importer writes every valid row as a new customer.

### 8.2 The summary

When the import ends, the admin sees a summary with the number of rows imported, skipped as duplicates and rejected.

When every row is imported, the summary says: "All 1,250 customers were imported."

When some rows are rejected, the summary says: "1,180 customers were imported. 70 rows were rejected; download the error report to see why."

### 8.3 Notifications

Admins are notified as appropriate.

## 9 The error report

The error report is a CSV file with one line per rejected or duplicate row: the row number, the column and the reason.

The error report can be downloaded for 7 days after the import.

## 10 Non-functional requirements

The Import page works in the current versions of Chrome, Edge, Firefox and Safari.

Uploaded files are deleted from temporary storage when the import ends.

Every import is recorded in the audit log with the admin, the time, the file name and the counts.

## 11 Open points

The date formats to accept are to be confirmed.

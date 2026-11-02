# Import customers from a CSV file

## 1 Purpose

Admins import customers from a CSV file instead of typing them in one by one.

## 2 File rules

Files are limited to 10,000 rows.

The maximum file size is 5 MB.

- The email column is required.
- Name is required.

| Column | Required | Format |
|---|---|---|
| Email | yes | a valid email address |
| Phone | no | digits only |

## 3 Duplicates

Rows whose email matches an existing customer are skipped.

## 4 Open points

The date formats to accept are to be confirmed.

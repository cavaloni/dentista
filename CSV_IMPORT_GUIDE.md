# File Import Feature Guide

## Overview

The file import feature allows you to bulk upload contacts to your waitlist. It includes:
- **CSV and Excel support** (.csv, .xlsx, .xls)
- **Smart column mapping** with fuzzy matching
- **Enhanced fuzzy search** powered by Fuse.js
- **Full client-side processing** - no data leaves your browser until import

## File Formats

### Required Fields
- **Name/Full Name**: Patient's full name
- **Phone/Email/Address**: Contact information (phone number, email, or WhatsApp number)

### Optional Fields
- **Channel**: Communication method (`whatsapp`, `sms`, or `email`)
- **Priority**: Urgency level (number, higher = more urgent)
- **Notes**: Additional information

### Example CSV

```csv
Name,Phone Number,Channel,Priority,Notes
John Doe,+31612345678,whatsapp,10,Prefers morning appointments
Jane Smith,+31687654321,sms,8,Allergic to latex
Bob Johnson,bob@example.com,email,5,Needs sedation
```

See `sample-contacts.csv` for a complete example.

## How It Works

### 1. Smart Column Mapping

The system automatically maps columns using fuzzy matching with support for both English and Dutch:

- **Name variations**: "Name", "Full Name", "Patient Name", "Naam", "Patiënt", etc.
- **Contact variations**: "Phone", "Mobile", "Email", "Telefoon", "Mobiel", etc.
- **Channel variations**: "Channel", "Method", "Kanaal", "Methode", etc.
- **Priority variations**: "Priority", "Urgency", "Prioriteit", "Urgentie", etc.
- **Notes variations**: "Notes", "Comments", "Opmerkingen", "Notities", etc.

### 2. Confidence Scoring

Each mapping receives a confidence score:
- **80-100%**: High confidence (green) - likely correct
- **60-79%**: Medium confidence (yellow) - review recommended
- **0-59%**: Low confidence (red) - manual review needed

### 3. Import Process

1. Click **"Import"** button on the waitlist page
2. Drag & drop or select your CSV/Excel file
3. Review the column mappings
4. Adjust any incorrect mappings manually using the dropdown
5. Click **"Import X contacts"** to complete
6. Contacts are imported in **inactive state** by default
7. Activate individual contacts as needed from the waitlist

## Enhanced Search

The patient search now uses **Fuse.js** for fuzzy matching:

- **Typo tolerance**: "Jon Doey" finds "John Doe"
- **Partial matches**: "doe" finds "John Doe"
- **Multi-field search**: Searches name, phone, and channel simultaneously
- **Weighted scoring**: Name matches score higher than address matches
- **Fast performance**: Client-side, instant results

### Search Shortcuts

- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to open search
- Type to filter patients
- Click or press Enter to select and scroll to patient

## Supported Column Name Variations

The system recognizes many variations of column names:

### Name Field
- name, full name, fullname, patient name, patientname
- patient, client name, clientname, person, contact name
- first name, last name (will be combined)

### Address/Contact Field
- phone, mobile, cell, telephone, number, phone number
- mobile number, cell number, contact
- email, e-mail, whatsapp, sms

### Channel Field
- channel, method, contact method, communication
- type, contact type, medium

### Priority Field
- priority, urgency, importance, level, rank

### Notes Field
- notes, note, comments, comment, remarks, remark
- description, details, memo

## Troubleshooting

### File Not Parsing
- **CSV**: Ensure file is valid CSV format with comma separation
- **Excel**: Ensure data is in the first sheet
- Verify file is not empty
- Check that the first row contains column headers

### Incorrect Mappings
- Manually adjust mappings using the dropdown menu
- Ensure column headers are descriptive
- Use standard column names like "Name", "Phone", "Email"

### Import Fails
- Check that required fields (name, address) are mapped
- Verify data format (phone numbers, emails)
- Check browser console for detailed errors

## Technical Details

### Libraries Used
- **papaparse**: CSV parsing
- **xlsx**: Excel file parsing (.xlsx, .xls)
- **fuse.js**: Fuzzy search
- **react-dropzone**: File upload UI
- **fastest-levenshtein**: String similarity matching

### Data Validation
- Phone numbers are normalized (e.g., `+31612345678`)
- Email addresses are validated
- Priority defaults to 10 if not specified
- Channel defaults to "whatsapp" if not specified
- All imported contacts are set to **inactive** by default for safety

### Performance
- Client-side parsing (no server upload until import)
- Bulk insert for efficient database operations
- Optimistic UI updates with Zustand store

## Privacy & Security

- **All files are processed entirely client-side** - no data sent to external servers
- Files never leave your browser until you click Import
- All imports require authentication
- Data is scoped to your practice

# CSV Import Feature Guide

## Overview

The CSV import feature allows you to bulk upload contacts to your waitlist. It includes:
- **Smart column mapping** with fuzzy matching
- **AI-assisted mapping** for ambiguous cases (using OpenRouter)
- **Enhanced fuzzy search** powered by Fuse.js

## Setup

### 1. Add OpenRouter API Key

Add the following to your `.env` file:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Get your API key from: https://openrouter.ai/keys

### 2. Cost Estimation

- **Without AI**: $0 (pure client-side fuzzy matching)
- **With AI**: ~$0.001-0.01 per CSV upload (only when "Fix with AI" is clicked)
- AI model used: `openai/gpt-4o-mini` (fast and cost-effective)

## CSV Format

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

The system automatically maps CSV columns using fuzzy matching:

- **Name variations**: "Name", "Full Name", "Patient Name", "Patient", etc.
- **Contact variations**: "Phone", "Mobile", "Email", "WhatsApp", "Number", etc.
- **Channel variations**: "Channel", "Method", "Type", etc.
- **Priority variations**: "Priority", "Urgency", "Importance", etc.
- **Notes variations**: "Notes", "Comments", "Remarks", "Description", etc.

### 2. Confidence Scoring

Each mapping receives a confidence score:
- **80-100%**: High confidence (green) - likely correct
- **60-79%**: Medium confidence (yellow) - review recommended
- **0-59%**: Low confidence (red) - manual review needed

### 3. AI-Assisted Mapping

If the automatic mapping is uncertain:
1. Click the **"Fix with AI"** button
2. The system sends only headers + 2-3 sample rows to OpenRouter
3. AI analyzes the data and suggests optimal mappings
4. Review and adjust as needed

### 4. Import Process

1. Click **"Import CSV"** button on the waitlist page
2. Drag & drop or select your CSV file
3. Review the column mappings
4. Adjust any incorrect mappings manually
5. (Optional) Click "Fix with AI" for better suggestions
6. Click **"Import X contacts"** to complete
7. Contacts are imported in **inactive state** by default
8. Activate individual contacts as needed from the waitlist

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

### CSV Not Parsing
- Ensure file is valid CSV format
- Check for proper comma separation
- Verify file is not empty

### Incorrect Mappings
- Manually adjust mappings in the preview
- Use "Fix with AI" for better suggestions
- Ensure column headers are descriptive

### Import Fails
- Check that required fields (name, address) are mapped
- Verify data format (phone numbers, emails)
- Check browser console for detailed errors

### AI Mapping Not Working
- Verify `OPENROUTER_API_KEY` is set in `.env`
- Check OpenRouter account has credits
- Review browser console for API errors

## Technical Details

### Libraries Used
- **papaparse**: CSV parsing
- **fuse.js**: Fuzzy search (2KB)
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

- CSV files are processed client-side
- Only headers + 3 sample rows sent to AI (when requested)
- No data stored on OpenRouter servers
- All imports require authentication
- Data scoped to your company/practice

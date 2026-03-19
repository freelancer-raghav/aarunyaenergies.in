/**
 * Aarunya Energies — Contact Form → Google Sheets
 * ─────────────────────────────────────────────────
 * HOW TO SET UP (one-time, ~5 minutes):
 *
 * 1. Go to https://sheets.google.com → create a new sheet
 *    Name it: "Aarunya Energies — Enquiries"
 *
 * 2. Go to https://script.google.com → click "New project"
 *    Name it: "Aarunya Enquiry Form"
 *
 * 3. Delete all existing code and paste THIS entire file.
 *
 * 4. Replace SPREADSHEET_ID below with your actual Sheet ID.
 *    (The Sheet ID is the long string in the Google Sheets URL:
 *     https://docs.google.com/spreadsheets/d/  ← THIS PART →  /edit)
 *
 * 5. Click Save (Ctrl+S), then click "Deploy" → "New deployment"
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    → Click "Deploy" → Authorize when prompted → Copy the Web App URL
 *
 * 6. Paste that URL into script.js where it says:
 *    const GOOGLE_SHEET_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
 *
 * 7. Push changes to GitHub. Done — every form submission
 *    now creates a new row in your Google Sheet instantly.
 *
 * NOTE: Any time you edit this script, click
 *       Deploy → Manage deployments → Edit → New version → Deploy
 *       (do NOT create a new deployment — just update the existing one)
 */

// ▶ Replace with your Google Sheet ID
var SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';

// Sheet tab name — will be created automatically if it doesn't exist
var SHEET_NAME = 'Enquiries';

// Blog sheet tab name — create this tab manually with the required columns
var BLOG_SHEET_NAME = 'Blog';

// Column headers (must match order in doPost below)
var HEADERS = [
  'Timestamp (IST)',
  'Name',
  'Company / Plant',
  'Phone',
  'Email',
  'Product Interested In',
  'Quantity (MT/month)',
  'Delivery Location',
  'Additional Message',
  'Referral Source',
  'Page URL',
];


/**
 * Runs when the form POSTs data to this Web App.
 */
function doPost(e) {
  try {
    var params = e.parameter;

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Create the sheet + header row on first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      formatHeaderRow_(sheet);
    }

    // Append the enquiry as a new row
    sheet.appendRow([
      params.timestamp  || new Date().toLocaleString('en-IN'),
      params.name       || '',
      params.company    || '',
      params.phone      || '',
      params.email      || '',
      params.product    || '',
      params.quantity   || '',
      params.location   || '',
      params.message    || '',
      params.source     || '',
      params.page       || '',
    ]);

    // Optional: send email notification to yourself
    sendNotificationEmail_(params);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Handles GET requests.
 *
 * Supported actions (via ?action= query param):
 *   blog_posts          → returns all Published posts (no content field, for listing)
 *   blog_post&slug=...  → returns single post including full content
 *   (none)              → health check, returns {"status":"live"}
 *
 * Blog sheet must have these column headers (row 1):
 *   slug | title | date | author | category | tags | excerpt |
 *   content | image_url | status | meta_description
 */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;

  if (action === 'blog_posts') {
    return getBlogPosts_();
  }

  if (action === 'blog_post') {
    var slug = e.parameter.slug || '';
    return getBlogPost_(slug);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'live', app: 'Aarunya Energies Enquiry Form' }))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Returns all published blog posts as a JSON array.
 * The heavy "content" field is omitted for listing performance.
 */
function getBlogPosts_() {
  try {
    var rows    = getBlogRows_();
    var headers = rows[0];
    var posts   = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rowToObj_(headers, rows[i]);
      if ((row.status || '').toLowerCase() !== 'published') continue;

      // Strip full content from listing — keeps response small
      delete row.content;
      posts.push(row);
    }

    // Sort newest first
    posts.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    return jsonResponse_(posts);
  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}


/**
 * Returns a single published blog post by slug, including full content.
 */
function getBlogPost_(slug) {
  try {
    if (!slug) return jsonResponse_({ error: 'slug required' });

    var rows    = getBlogRows_();
    var headers = rows[0];

    for (var i = 1; i < rows.length; i++) {
      var row = rowToObj_(headers, rows[i]);
      if (row.slug === slug) {
        if ((row.status || '').toLowerCase() !== 'published') {
          return jsonResponse_({ error: 'not found' });
        }
        return jsonResponse_(row);
      }
    }

    return jsonResponse_({ error: 'not found' });
  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}


/** Reads all rows from the Blog sheet. */
function getBlogRows_() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(BLOG_SHEET_NAME);
  if (!sheet) throw new Error('Blog sheet tab not found. Create a tab named "' + BLOG_SHEET_NAME + '".');
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('Blog sheet is empty.');
  return data;
}


/** Converts a header array + value row into a plain object. */
function rowToObj_(headers, row) {
  var obj = {};
  for (var j = 0; j < headers.length; j++) {
    var key = String(headers[j]).trim().toLowerCase().replace(/\s+/g, '_');
    var val = row[j];
    // Convert Date objects to ISO string
    obj[key] = val instanceof Date ? val.toISOString().split('T')[0] : String(val === null || val === undefined ? '' : val);
  }
  return obj;
}


/** Wraps any value as a CORS-friendly JSON response. */
function jsonResponse_(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}


/**
 * Sends an email notification when a new enquiry arrives.
 * Remove or comment out this call in doPost() if you don't want emails.
 */
function sendNotificationEmail_(params) {
  var recipient = Session.getActiveUser().getEmail(); // your Google account email
  var subject   = 'New Enquiry — ' + (params.product || 'Biofuel') + ' — Aarunya Energies';

  var body = [
    'A new enquiry has been submitted on your website.',
    '',
    'Name:     ' + params.name,
    'Company:  ' + params.company,
    'Phone:    ' + params.phone,
    'Email:    ' + params.email,
    'Product:  ' + params.product,
    'Quantity: ' + params.quantity,
    'Location: ' + params.location,
    'Message:  ' + params.message,
    '',
    'Timestamp: ' + params.timestamp,
    'Source:    ' + params.source,
    '',
    'View all enquiries: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID,
  ].join('\n');

  MailApp.sendEmail(recipient, subject, body);
}


/**
 * Applies bold + background colour to the header row.
 */
function formatHeaderRow_(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1b4332');
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 180);
}

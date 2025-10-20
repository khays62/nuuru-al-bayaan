# Printing reports

This app includes consistent, professional print support across key pages:

- Shared print header (`PrintHeader`) with logo, report title/subtitle, and metadata (AY, Grade, Shift, Section).
- Shared print footer (`PrintFooter`) with generation timestamp and page numbers (Page X of Y).
- Print CSS sets A4 size and margins and preserves brand colors.

Where available today:
- Results: `src/pages/ResultPage.jsx`
- Transcripts: `src/pages/TranscriptPage.jsx`
- Student Profile: `src/pages/StudentProfilePage.jsx`

Tips:
- Use the page’s Print button or your browser’s print dialog.
- In the Transcript page, multiple students can be printed together; each student block is marked `avoid-break` to reduce splitting across pages.
- For best results, disable headers/footers in the browser print dialog so only the in-app header/footer are printed.

If you add a new printable page:
- Import and render `PrintHeader` and `PrintFooter`.
- Pass a meaningful title and a small set of `meta` strings for the context (e.g., AY/Grade/Shift/Section).
- Wrap long blocks with `avoid-break` or insert `page-break` where needed.

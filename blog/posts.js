/* The letters, as blog.js reads them.
 *
 * THIS FILE IS GENERATED. Run
 *
 *     node blog/import-gmail.mjs <folder of exported mail>
 *
 * over the Gmail exports and it is rewritten from them. What is here now is two
 * stand-ins so the page can be looked at before the real ones arrive; the
 * importer replaces the whole file, stand-ins and all.
 *
 * A letter is:
 *
 *   id           the bit after the # in the URL. Lower case, hyphens, stable —
 *                changing one breaks any link anybody already has.
 *   subject      the subject line, as sent.
 *   date         ISO 8601. Sorts the mailbox and prints under the subject.
 *   fromName     who it came from, shown in the list and above the letter.
 *   fromAddress  optional, shown in angle brackets next to the name.
 *   to           optional, the "to ..." line. Defaults to "friends and family".
 *   labels       optional list. Each becomes a folder in the rail and a chip on
 *                the row, coloured from its own letters.
 *   preview      the grey text after the subject in the list. One line.
 *   body         the letter itself, as HTML, already sanitised by the importer.
 */
window.BLOG_POSTS = [
  {
    id: "how-this-page-works",
    subject: "How this page works",
    date: "2026-09-03T09:00:00-04:00",
    fromName: "Noah Darwin Lee",
    fromAddress: "noahlee519@gmail.com",
    to: "me",
    labels: ["placeholder"],
    preview: "A note to self, and the second of two stand-ins.",
    body:
      "<p>This letter and the one below it are placeholders. They are here so the " +
      "page can be looked at before the real ten are imported, and they disappear " +
      "the moment the importer runs.</p>" +
      "<p>To put the real letters in: export the ten from Gmail, drop them in a " +
      "folder, and run</p>" +
      "<pre>node blog/import-gmail.mjs ~/path/to/that/folder</pre>" +
      "<p>It reads <code>.html</code> and <code>.eml</code>, pulls out the subject, " +
      "the date and the body, saves any images that were attached into " +
      "<code>blog/images/</code>, throws away the markup Gmail wraps around a " +
      "message, and writes this file.</p>" +
      "<p>Labels are the one thing it cannot guess. Add them by hand afterwards — " +
      "a city or a country per letter — and they become the folders in the rail.</p>"
  },
  {
    id: "sample-letter",
    subject: "A sample letter, so the layout has something to hold",
    date: "2026-08-28T18:20:00-04:00",
    fromName: "Noah Darwin Lee",
    fromAddress: "noahlee519@gmail.com",
    to: "friends and family",
    labels: ["placeholder"],
    preview: "Not a real letter. Filler, so the reading pane is not empty.",
    body:
      "<p>This is filler text standing in for a real letter, so that the reading " +
      "pane, the line length and the spacing can be judged before the real ones " +
      "arrive. It is deliberately not travel writing, so nobody mistakes it for " +
      "something that was actually sent.</p>" +
      "<p>A paragraph of about this length is what most of a letter will be. The " +
      "measure is set so a line lands near sixty-five characters, which is where " +
      "reading is easiest, and the pane scrolls on its own rather than moving the " +
      "page underneath it.</p>" +
      "<blockquote><p>A quotation, to check what one looks like against the left " +
      "edge.</p></blockquote>" +
      "<p>And a last paragraph, to leave something under the quotation.</p>"
  }
];

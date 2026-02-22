# Plan for storing precompressed content on bucket

(Gemini reco)

## 1. The BUcket Strategy (Manual & Lean)
Since the bucket won't help you, you take full control.

The Workflow: 
1.  Minify your HTML/CSS/JS.
2.  Gzip the files (Gzip level 9 for maximum tiny-ness).
3.  Rename index.html.gz → index.html (overwrite).
4.  Upload with the flag: --header "Content-Encoding: gzip".

Result: The fastest possible delivery with the lowest possible storage costs.

## 2. The PocketBase Strategy (Dynamic & Simple)
PocketBase is an active Go-based server. It prefers to handle the "zipping" at the moment the user asks for the file.

The Workflow:

Minify your files (always good to reduce the raw parse size).

Upload the raw .html files to pb_public.

PocketBase sees the browser's Accept-Encoding: gzip request and compresses the file on-the-fly.

Result: Much easier local debugging because your pb_public folder contains readable HTML, not binary gibberish.

## 3. The "Sim-Server" 
Because your local file system doesn't "speak" Gzip headers, the sim-server.js acts as your local emulator.


## 4. The "Decompression Speed" Myth
In most compression algorithms (like Gzip's DEFLATE or Brotli), the heavy lifting (CPU work) happens during compression, not decompression.

Compression Level 1-9 (Gzip) / 1-11 (Brotli): This setting tells your computer how hard to look for patterns to shrink the file.

Decompression: The browser doesn't have to search for patterns; it just follows the "instructions" already laid out in the compressed file.

In fact, a file compressed at Level 9 (Gzip) or Level 11 (Brotli) often decompresses faster than a lower-level one because there are literally fewer bytes for the browser's CPU to read and process.

## GZip vs Brotli

In 2026, Brotli is not just "better"—it has become the industry standard for static web assets. It offers significant advantages over Gzip, particularly for the type of educational, text-heavy content you are building.

Here is the breakdown of why you should consider switching to it for your Scaleway Bucket.

### 1. Is it better? (The "20% Rule")
Brotli was designed by Google specifically for web text (HTML, CSS, JS).

Built-in Dictionary: Unlike Gzip, Brotli comes with a pre-defined dictionary of common web strings (like <div>, class=, javascript, etc.). This means it doesn't have to "learn" these patterns for every file; it already knows them.

Compression Gains: On average, Brotli makes files 15–25% smaller than Gzip at the same perceived quality.

Result: A file that was 100KB with Gzip might be 75KB–80KB with Brotli.

### 2. Is it well supported?
Yes. As of 2026, Brotli support is essentially universal (around 97–98% of global traffic).

Browsers: Chrome, Firefox, Edge, and Safari have supported it for years.

Mobile: Fully supported on iOS and Android.

The Fallback: If a user is on a very old browser (like IE11), they just won't send the Accept-Encoding: br header. Your server/bucket logic would then simply serve the Gzip version instead.

### 3. Comparison Table: Gzip vs. Brotli

| Feature             |	Gzip (Level 9) | Brotli (Level 11) | Winner |
|---------------------|----------------|-------------------|--------|
| File Size           |	Good           | Excellent         | Brotli |
| Compression Speed   |	Fast           | Very Slow         | Gzip   |
| Decompression Speed |	Very Fast      | Very Fast         | Tie    |
| Browser Support     |	100%           | ~98%              | Gzip   |	

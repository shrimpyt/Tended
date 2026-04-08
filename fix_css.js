const fs = require('fs');

let css = fs.readFileSync('tended-web/app/globals.css', 'utf8');

// The default primary #059669 on white text is 3.76, which fails WCAG AA for normal text (requires 4.5).
// We should update it to #047857 which has 5.48 ratio for better contrast.
// Wait, primary on dark background is 5.35 which is fine, but primary foreground is #FFFFFF.
// If primary is #059669, #FFFFFF on #059669 is 3.76, which is barely WCAG AA for large text but fails for normal text (4.5:1).
// Changing it to #047857 ensures > 4.5 ratio.

css = css.replace(/--primary:\s+#059669;/g, '--primary:            #047857;');

fs.writeFileSync('tended-web/app/globals.css', css);

const fs = require('fs');
let css = fs.readFileSync('tended-web/app/globals.css', 'utf8');

// #10B981 is primaryEmerald. Contrast with white is 2.53, contrast with background is 7.8.
// If it has white text on it, it fails WCAG AA completely.
// Let's replace #10B981 with #047857 to make it accessible when white text is placed on it.
css = css.replace(/--primary:\s+#10B981;/g, '--primary:      #047857;');

// For space theme: #60A5FA has contrast 2.54 on white text.
// We should use a darker blue if white text is placed on it.
// Let's use #2563EB which has 5.16 contrast.
css = css.replace(/--primary:\s+#60A5FA;/g, '--primary:      #2563EB; /* Darker blue for WCAG AA compliance with white text */');

fs.writeFileSync('tended-web/app/globals.css', css);

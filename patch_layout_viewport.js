const fs = require('fs');

let layout = fs.readFileSync('tended-web/app/layout.tsx', 'utf8');

const viewportString = `import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
`;

layout = layout.replace(/import type { Metadata } from "next";/, viewportString);

fs.writeFileSync('tended-web/app/layout.tsx', layout);

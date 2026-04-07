const fs = require('fs');

let layout = fs.readFileSync('tended-web/app/layout.tsx', 'utf8');

const metadataPatch = `export const metadata: Metadata = {
  title: "Tended - Household Management",
  description: "Household inventory & smart kitchen management app.",
  applicationName: "Tended",
  appleWebApp: {
    capable: true,
    title: "Tended",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};`;

layout = layout.replace(/export const metadata: Metadata = {[\s\S]*?};/, metadataPatch);

fs.writeFileSync('tended-web/app/layout.tsx', layout);

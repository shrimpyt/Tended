function getLuminance(r, g, b) {
    const a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928
            ? v / 12.92
            : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function contrast(rgb1, rgb2) {
    const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

// Check Deep Space default theme
const bgHex = "#020617"; // space theme background? Space theme sets primary #60A5FA and ring to primary. The global default is:
// --background: #0A0A0B; --foreground: #F0F0F2; --primary: #059669; --card: #0E0E10;
// wait, globals.css says:
/* Default: Forest Navy (Hybrid) */
// --primary: #059669; --background: #020617; --card: #01040f;

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

const colors = {
    bg: "#0A0A0B",
    bgForest: "#020617",
    card: "#0E0E10",
    fg: "#F0F0F2",
    primaryEmerald: "#10B981",
    primaryForest: "#059669",
    primarySpace: "#60A5FA",
};

for (const [key, val] of Object.entries(colors)) {
    console.log(key, val);
}

console.log("Foreground on BG", contrast(hexToRgb(colors.fg), hexToRgb(colors.bg)));
console.log("Primary Forest on BG Forest", contrast(hexToRgb(colors.primaryForest), hexToRgb(colors.bgForest)));
console.log("Primary Forest on White (for button text?)", contrast(hexToRgb(colors.primaryForest), [255,255,255]));
console.log("Primary Space on BG Space?", contrast(hexToRgb(colors.primarySpace), hexToRgb(colors.bg)));
console.log("Primary Space on White", contrast(hexToRgb(colors.primarySpace), [255,255,255]));
console.log("Primary Emerald on BG", contrast(hexToRgb(colors.primaryEmerald), hexToRgb(colors.bg)));
console.log("Primary Emerald on White", contrast(hexToRgb(colors.primaryEmerald), [255,255,255]));

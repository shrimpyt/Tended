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

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

const white = [255, 255, 255];
const darkText = [2, 6, 23];

console.log("Current Forest #059669 on White:", contrast(hexToRgb("#059669"), white));
console.log("Darker Forest #047857 on White:", contrast(hexToRgb("#047857"), white));
console.log("Current Space #60A5FA on White:", contrast(hexToRgb("#60A5FA"), white));
console.log("Current Space #60A5FA on Dark:", contrast(hexToRgb("#60A5FA"), darkText));
console.log("Darker Space #2563EB on White:", contrast(hexToRgb("#2563EB"), white));

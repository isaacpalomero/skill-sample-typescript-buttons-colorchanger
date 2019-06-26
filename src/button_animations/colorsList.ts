// HTML color Picker site - https://www.w3schools.com/colors/colors_picker.asp
// Choose a shade darker than you intend
const COLORS: { [key: string]: string } = {
    "white": "ffffff",
    "red": "ff0000",
    "orange": "ff3300",
    "green": "00ff00",
    "dark green": "004411",
    "blue": "0000ff",
    "light blue": "00a0b0",
    "purple": "4b0098",
    "yellow": "ffd400",
    "black": "000000",
};

export function getColor(colorName: string): string | undefined {
    if (typeof colorName === "string" &&
        COLORS[colorName.toLowerCase()]) {
        return COLORS[colorName.toLowerCase()];
    }
    console.log("UNKNOWN COLOR: " + colorName);
    return undefined;
}

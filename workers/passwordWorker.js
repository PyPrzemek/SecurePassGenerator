// workers/passwordWorker.js

self.onmessage = function(e) {
    const { action, data } = e.data;

    if (action === "generatePassword") {
        const { mode, settings } = data;
        let generated;
        if (mode === "standard") {
            generated = generateStandardPassword(settings);
        } else if (mode === "advanced") {
            generated = generateAdvancedPassword(settings.pattern, settings.startWithLetter);
        } else if (mode === "pin") {
            generated = generatePIN(settings.pinLength);
        }
        self.postMessage({ action: "passwordGenerated", password: generated });
    }
};

function generateStandardPassword(settings) {
    const { length, includeUppercase, includeNumbers, includeSymbols } = settings;

    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+[]{}<>?,.";

    let allChars = lowerChars;
    if (includeUppercase) allChars += upperChars;
    if (includeNumbers) allChars += numberChars;
    if (includeSymbols) allChars += symbolChars;

    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * allChars.length);
        password += allChars[randomIndex];
    }

    return password;
}

function generateAdvancedPassword(pattern, startWithLetter) {
    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+[]{}<>?,.";

    let password = "";

    for (let char of pattern) {
        let chars = "";
        switch (char) {
            case 'L':
                chars = lowerChars + upperChars;
                break;
            case '#':
                chars = numberChars;
                break;
            case '!':
                chars = symbolChars;
                break;
            default:
                chars = char; // Literal character
                break;
        }
        if (chars.length === 1) {
            password += chars;
        } else {
            const randomIndex = Math.floor(Math.random() * chars.length);
            password += chars[randomIndex];
        }
    }

    if (startWithLetter && !/^[A-Za-z]/.test(password)) {
        const firstChar = lowerChars + upperChars;
        const randomIndex = Math.floor(Math.random() * firstChar.length);
        password = firstChar[randomIndex] + password.slice(1);
    }

    return password;
}

function generatePIN(length) {
    const numberChars = "0123456789";
    let pin = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * numberChars.length);
        pin += numberChars[randomIndex];
    }
    return pin;
}

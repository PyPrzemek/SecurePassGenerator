// Globalna zmienna na tłumaczenia
let translations = {};

// Klucz szyfrowania (domyślny)
const DEFAULT_ENCRYPTION_KEY = "Twoj_Tajne_Klucz";

// Funkcja ładowania tłumaczeń z pliku JSON
async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
        applyTranslations();
    } catch (error) {
        console.error("Błąd ładowania tłumaczeń:", error);
    }
}

// Funkcja stosująca tłumaczenia do interfejsu
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[key]) {
            element.setAttribute('placeholder', translations[key]);
        }
    });
}

// Funkcja przełączająca tryb ciemny/jasny z pamięcią ustawień
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle("dark-mode");

    const isDarkMode = body.classList.contains("dark-mode");
    document.getElementById("darkModeToggle").textContent = isDarkMode ? translations["title_dark"] || "Przełącz na Tryb Jasny" : translations["title_light"] || "Przełącz na Tryb Ciemny";

    // Zapisz preferencję w localStorage
    localStorage.setItem("darkMode", isDarkMode);
}

// Funkcja zmieniająca język interfejsu
function changeLanguage(lang) {
    localStorage.setItem("language", lang);
    loadTranslations(lang);
}

// Funkcja oceniająca siłę hasła i aktualizująca wskaźnik
function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    let strength = translations["weak"] || "Słaba";
    let strengthValue = 20;
    let strengthColor = "bg-red-600";
    let suggestion = "";

    if (score >= 4) {
        strength = translations["strong"] || "Silna";
        strengthValue = 100;
        strengthColor = "bg-green-600";
    } else if (score >= 2) {
        strength = translations["medium"] || "Średnia";
        strengthValue = 60;
        strengthColor = "bg-yellow-600";
        suggestion = translations["passwordSuggestion"] || "Dodaj liczby lub symbole, aby wzmocnić hasło.";
    } else {
        strength = translations["weak"] || "Słaba";
        strengthValue = 20;
        strengthColor = "bg-red-600";
        suggestion = translations["passwordSuggestionWeak"] || "Dodaj więcej znaków, liczb i symboli.";
    }

    const strengthBar = document.getElementById("strengthBar");
    const strengthText = document.getElementById("strengthText");
    const strengthContainer = document.getElementById("strengthContainer");

    strengthBar.className = `${strengthColor} h-2.5 rounded-full transition`;
    strengthBar.style.width = `${strengthValue}%`;
    strengthText.textContent = strength;
    strengthContainer.classList.remove("hidden");

    // Dodanie sugestii
    let suggestionElement = document.getElementById("strengthSuggestion");
    if (!suggestionElement) {
        suggestionElement = document.createElement("p");
        suggestionElement.id = "strengthSuggestion";
        suggestionElement.className = "text-sm text-gray-600 mt-1";
        strengthContainer.appendChild(suggestionElement);
    }
    suggestionElement.innerHTML = suggestion ? `<a href="#" onclick="improvePassword()">${translations["improvePassword"] || "Kliknij tutaj, aby poprawić"}</a>` : "";
}

// Funkcja poprawiająca hasło
function improvePassword() {
    alert(translations["passwordSuggestion"] || "Dodaj liczby lub symbole, aby wzmocnić hasło.");
}

// Funkcja generująca standardowe hasło
function generatePassword() {
    const length = parseInt(document.getElementById("passwordLength").value);
    const includeUppercase = document.getElementById("includeUppercase").checked;
    const includeNumbers = document.getElementById("includeNumbers").checked;
    const includeSymbols = document.getElementById("includeSymbols").checked;

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

// Funkcja generująca zaawansowane hasło według wzoru
function generateAdvancedPassword(pattern, startWithLetter) {
    const lowerChars = "abcdefghijklmnopqrstuvwxyz";
    const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numberChars = "0123456789";
    const symbolChars = "!@#$%^&*()_+[]{}<>?,.";

    let password = "";

    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        let chars = "";
        switch(char) {
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

// Funkcja generująca PIN
function generatePIN(length) {
    const numberChars = "0123456789";
    let pin = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * numberChars.length);
        pin += numberChars[randomIndex];
    }
    return pin;
}

// Funkcja szyfrująca tekst z dynamicznym kluczem
function encrypt(text) {
    const key = document.getElementById("encryptionKey").value || DEFAULT_ENCRYPTION_KEY;
    return CryptoJS.AES.encrypt(text, key).toString();
}

// Funkcja odszyfrowująca tekst z dynamicznym kluczem
function decrypt(ciphertext) {
    const key = document.getElementById("encryptionKey").value || DEFAULT_ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

// Funkcja główna generująca hasła lub PIN
function generate() {
    const mode = document.getElementById("generationMode").value;
    const quantity = parseInt(document.getElementById("quantity").value);
    let output = "";

    for (let i = 0; i < quantity; i++) {
        let generated;
        if (mode === "standard") {
            generated = generatePassword();
        } else if (mode === "advanced") {
            const pattern = document.getElementById("pattern").value.trim();
            const startWithLetter = document.getElementById("startWithLetter").checked;
            if (pattern === "") {
                alert(translations["patternPlaceholder"] || "Please enter a pattern for advanced generation.");
                return;
            }
            generated = generateAdvancedPassword(pattern, startWithLetter);
        } else if (mode === "pin") {
            const pinLength = parseInt(document.getElementById("pinLength").value);
            generated = generatePIN(pinLength);
        }
        output += generated + "";
        saveToHistory(generated);
    }

    document.getElementById("passwordOutput").textContent = output.trim();

    if (mode !== "pin") {
        evaluatePasswordStrength(output.trim());
    } else {
        document.getElementById("strengthContainer").classList.add("hidden");
    }
}

// Funkcja kopiująca hasło do schowka
function copyToClipboard() {
    const passwordOutput = document.getElementById("passwordOutput").textContent;
    navigator.clipboard.writeText(passwordOutput).then(() => {
        alert(translations["copySuccess"] || "Password copied to clipboard!");
    }).catch(err => {
        alert(translations["copyError"] || "Error copying password.");
    });
}

// Funkcja zapisująca hasło do historii z szyfrowaniem
function saveToHistory(item) {
    let history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    const encryptedItem = encrypt(item);
    history.push(encryptedItem);
    if (history.length > 10) history = history.slice(-10); // Zachowaj ostatnie 10 wpisów
    localStorage.setItem("passwordHistory", JSON.stringify(history));
    updateHistoryDisplay();
}

// Funkcja aktualizująca wyświetlaną historię haseł z odszyfrowaniem
function updateHistoryDisplay() {
    const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    history.forEach((encryptedItem, index) => {
        const decryptedItem = decrypt(encryptedItem);
        const listItem = document.createElement("li");
        listItem.className = "flex justify-between items-center mb-2";
        listItem.textContent = decryptedItem;
        
        const deleteButton = document.createElement("button");
        deleteButton.textContent = translations["clearHistory"] || "Usuń";
        deleteButton.className = "ml-4 py-1 px-2 bg-red-400 text-white rounded hover:bg-red-500 transition";
        deleteButton.onclick = () => deleteHistoryItem(index);
        
        listItem.appendChild(deleteButton);
        historyList.appendChild(listItem);
    });
}

// Funkcja usuwająca pojedynczy wpis z historii
function deleteHistoryItem(index) {
    let history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    history.splice(index, 1);
    localStorage.setItem("passwordHistory", JSON.stringify(history));
    updateHistoryDisplay();
}

// Funkcja eksportująca historię haseł z odszyfrowaniem
function exportHistory() {
    const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    if (history.length === 0) {
        alert(translations["exportError"] || "No history to export.");
        return;
    }
    const decryptedHistory = history.map(item => decrypt(item));
    const historyText = decryptedHistory.join("");
    const blob = new Blob([historyText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historia_haseł.txt";
    link.click();

    // Powiadomienie użytkownika
    alert(translations["exportSuccess"] || "History exported successfully!");
}

// Funkcja czyszcząca całą historię haseł
function clearHistory() {
    if (confirm(translations["confirmClear"] || "Are you sure you want to clear all password history?")) {
        localStorage.removeItem("passwordHistory");
        updateHistoryDisplay();
        alert(translations["clearSuccess"] || "History cleared successfully!");
    }
}

// Funkcja przełączająca widoczność opcji generowania
function toggleGenerationOptions(mode) {
    document.getElementById("advancedOptions").classList.add("hidden");
    document.getElementById("pinOptions").classList.add("hidden");

    if (mode === "advanced") {
        document.getElementById("advancedOptions").classList.remove("hidden");
    } else if (mode === "pin") {
        document.getElementById("pinOptions").classList.remove("hidden");
    }
}

// Funkcja zapisująca aktualne ustawienia jako ulubione
function saveSettings() {
    const settings = {
        passwordLength: document.getElementById("passwordLength").value,
        includeUppercase: document.getElementById("includeUppercase").checked,
        includeNumbers: document.getElementById("includeNumbers").checked,
        includeSymbols: document.getElementById("includeSymbols").checked,
        generationMode: document.getElementById("generationMode").value,
        pattern: document.getElementById("pattern").value,
        startWithLetter: document.getElementById("startWithLetter").checked,
        pinLength: document.getElementById("pinLength").value,
        quantity: document.getElementById("quantity").value,
        encryptionKey: document.getElementById("encryptionKey").value
    };

    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    const name = prompt(translations["saveSettings"] || "Please enter a name for your favorite settings:");
    if (name) {
        favorites.push({ name, settings });
        localStorage.setItem("favorites", JSON.stringify(favorites));
        updateFavoritesSelector();
        alert(translations["saveSettingsSuccess"] || "Settings saved successfully.");
    }

    // Zapisz klucz szyfrowania
    const encryptionKey = document.getElementById("encryptionKey").value;
    if (encryptionKey) {
        localStorage.setItem("encryptionKey", encryptionKey);
    }
}

// Funkcja aktualizująca selector ulubionych ustawień
function updateFavoritesSelector() {
    const selector = document.getElementById("loadSettingsSelector");
    selector.innerHTML = `<option value="" disabled selected data-i18n="loadFavorites">Wczytaj Ulubione Ustawienia</option>`;
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    favorites.forEach((fav, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = fav.name;
        selector.appendChild(option);
    });
}

// Funkcja wczytująca wybrane ulubione ustawienia
function loadSettings(index) {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites[index]) {
        const settings = favorites[index].settings;
        document.getElementById("passwordLength").value = settings.passwordLength;
        updateLengthDisplay(settings.passwordLength);
        document.getElementById("includeUppercase").checked = settings.includeUppercase;
        document.getElementById("includeNumbers").checked = settings.includeNumbers;
        document.getElementById("includeSymbols").checked = settings.includeSymbols;
        document.getElementById("generationMode").value = settings.generationMode;
        toggleGenerationOptions(settings.generationMode);
        document.getElementById("pattern").value = settings.pattern;
        document.getElementById("startWithLetter").checked = settings.startWithLetter;
        document.getElementById("pinLength").value = settings.pinLength;
        document.getElementById("quantity").value = settings.quantity;
        document.getElementById("encryptionKey").value = settings.encryptionKey;
    }
}

// Funkcja eksportująca do KeePass (CSV format)
function exportToKeePass() {
    const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    if (history.length === 0) {
        alert(translations["exportError"] || "Brak haseł do eksportu.");
        return;
    }

    let csvContent = "Title,Username,Password,URL,Notes";
    history.forEach((password, index) => {
        const decryptedPassword = decrypt(password);
        csvContent += `Password ${index + 1},,${decryptedPassword},,
`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "keePass_export.csv";
    link.click();

    alert(translations["exportSuccess"] || "Eksport do KeePass został pomyślnie wykonany!");
}

// Funkcja eksportująca do LastPass (CSV format)
function exportToLastPass() {
    const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
    if (history.length === 0) {
        alert(translations["exportError"] || "Brak haseł do eksportu.");
        return;
    }

    let csvContent = "url,username,password,notes";
    history.forEach((password, index) => {
        const decryptedPassword = decrypt(password);
        csvContent += `,Password ${index + 1},${decryptedPassword},
`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lastPass_export.csv";
    link.click();

    alert(translations["exportSuccess"] || "Eksport do LastPass został pomyślnie wykonany!");
}

// Funkcja inicjalizująca ustawienia przy ładowaniu strony
function initializeSettings() {
    // Ustawienie trybu ciemnego jeśli zapisany
    const darkMode = JSON.parse(localStorage.getItem("darkMode"));
    if (darkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("darkModeToggle").textContent = "Przełącz na Tryb Jasny";
    } else {
        document.getElementById("darkModeToggle").textContent = "Przełącz na Tryb Ciemny";
    }

    // Pobierz język z localStorage lub ustaw domyślnie na polski
    const language = localStorage.getItem("language") || "pl";
    document.getElementById("languageSelector").value = language;
    loadTranslations(language);

    // Aktualizacja selector ulubionych ustawień
    updateFavoritesSelector();

    // Wczytaj klucz szyfrowania jeśli zapisany
    const savedKey = localStorage.getItem("encryptionKey");
    if (savedKey) {
        document.getElementById("encryptionKey").value = savedKey;
    }
}

// Event Listener dla zmian trybu generowania
document.getElementById("generationMode").addEventListener("change", function() {
    toggleGenerationOptions(this.value);
});

// Inicjalizacja ustawień przy ładowaniu strony
document.addEventListener("DOMContentLoaded", () => {
    initializeSettings();
    updateHistoryDisplay();
});

// Funkcja aktualizująca wyświetlaną długość hasła
function updateLengthDisplay(value) {
    document.getElementById("lengthDisplay").textContent = value;
}

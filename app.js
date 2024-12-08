// app.js

class CryptoManager {
    constructor() {
        this.key = null;
    }

    async initializeKey() {
        const storedKey = localStorage.getItem("encryptionKey");
        if (storedKey) {
            this.key = await crypto.subtle.importKey(
                "raw",
                this.hexToArrayBuffer(storedKey),
                { name: "AES-GCM" },
                true,
                ["encrypt", "decrypt"]
            );
        } else {
            const key = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );
            const rawKey = await crypto.subtle.exportKey("raw", key);
            localStorage.setItem("encryptionKey", this.arrayBufferToHex(rawKey));
            this.key = key;
        }
    }

    async encrypt(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            this.key,
            data
        );
        return this.arrayBufferToHex(iv) + this.arrayBufferToHex(encrypted);
    }

    async decrypt(hex) {
        try {
            const iv = this.hexToArrayBuffer(hex.slice(0, 24));
            const encrypted = this.hexToArrayBuffer(hex.slice(24));
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                this.key,
                encrypted
            );
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error("Decryption failed:", error);
            return "Błąd odszyfrowania";
        }
    }

    arrayBufferToHex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    }

    hexToArrayBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes.buffer;
    }
}

class TranslationManager {
    constructor() {
        this.currentLanguage = localStorage.getItem("language") || "pl";
        this.translations = {};
    }

    async loadTranslations() {
        try {
            const response = await fetch(`locales/${this.currentLanguage}.json`);
            if (!response.ok) throw new Error('Translation file not found.');
            this.translations = await response.json();
            this.applyTranslations();
        } catch (error) {
            console.error("Error loading translations:", error);
        }
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute("data-i18n");
            if (this.translations[key]) {
                element.textContent = this.translations[key];
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute("data-i18n-placeholder");
            if (this.translations[key]) {
                element.setAttribute("placeholder", this.translations[key]);
            }
        });
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem("language", lang);
        this.loadTranslations();
    }

    getTranslation(key) {
        return this.translations[key] || key;
    }
}

class PasswordGenerator {
    constructor(translationManager) {
        this.translationManager = translationManager;
        this.worker = new Worker('workers/passwordWorker.js');

        // Listener na wiadomości z workera
        this.worker.onmessage = (e) => {
            const { action, password } = e.data;
            if (action === "passwordGenerated") {
                if (this.onPasswordGenerated) {
                    this.onPasswordGenerated(password);
                }
            }
        };

        // Callback, który będzie wywoływany po wygenerowaniu hasła
        this.onPasswordGenerated = null;
    }

    generatePassword(mode, settings, callback) {
        this.onPasswordGenerated = callback;
        this.worker.postMessage({ action: "generatePassword", data: { mode, settings } });
    }
}

class HistoryManager {
    constructor(cryptoManager, translationManager) {
        this.cryptoManager = cryptoManager;
        this.translationManager = translationManager;
        this.historyLimit = 20;
    }

    async saveToHistory(password, tag = "") {
        let history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
        const encryptedPassword = await this.cryptoManager.encrypt(password);
        history.push({ password: encryptedPassword, tag: tag });
        if (history.length > this.historyLimit) history = history.slice(-this.historyLimit); // Zachowaj ostatnie 20 wpisów
        localStorage.setItem("passwordHistory", JSON.stringify(history));
        UIManager.updateHistoryDisplay();
    }

    async getHistory() {
        const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
        const decryptedHistory = [];
        for (const entry of history) {
            const decrypted = await this.cryptoManager.decrypt(entry.password);
            decryptedHistory.push({ password: decrypted, tag: entry.tag });
        }
        return decryptedHistory;
    }

    async clearHistory() {
        if (confirm(this.translationManager.getTranslation("confirmClear"))) {
            localStorage.removeItem("passwordHistory");
            UIManager.updateHistoryDisplay();
            alert(this.translationManager.getTranslation("clearSuccess"));
        }
    }

    async deleteHistoryItem(index) {
        let history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
        history.splice(index, 1);
        localStorage.setItem("passwordHistory", JSON.stringify(history));
        UIManager.updateHistoryDisplay();
    }

    async exportToKeePass() {
        const history = await this.getHistory();
        if (history.length === 0) {
            alert(this.translationManager.getTranslation("exportError"));
            return;
        }

        let csvContent = "Title,Username,Password,URL,Notes\n";
        history.forEach((entry, index) => {
            const escapedPassword = entry.password.replace(/"/g, '""'); // Escaping quotes
            const escapedTag = entry.tag.replace(/"/g, '""');
            csvContent += `"Password ${index + 1}",,"${escapedPassword}",,"${escapedTag}"\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "keePass_export.csv";
        link.click();

        alert(this.translationManager.getTranslation("exportSuccess"));
        UIManager.closeExportModal();
    }

    async exportToLastPass() {
        const history = await this.getHistory();
        if (history.length === 0) {
            alert(this.translationManager.getTranslation("exportError"));
            return;
        }

        let csvContent = "url,username,password,notes\n";
        history.forEach((entry, index) => {
            const escapedPassword = entry.password.replace(/"/g, '""'); // Escaping quotes
            const escapedTag = entry.tag.replace(/"/g, '""');
            csvContent += `,Password ${index + 1},"${escapedPassword}","${escapedTag}"\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "lastPass_export.csv";
        link.click();

        alert(this.translationManager.getTranslation("exportSuccess"));
        UIManager.closeExportModal();
    }

    async importFromCSV(file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n').slice(1); // Pomijamy nagłówek
                for (const line of lines) {
                    const [title, username, password, url, notes] = line.split(',');
                    if (password) {
                        const decryptedPassword = password.replace(/""/g, '"').replace(/^"|"$/g, '');
                        const decryptedTag = notes.replace(/""/g, '"').replace(/^"|"$/g, '');
                        await this.saveToHistory(decryptedPassword, decryptedTag);
                    }
                }
                alert(this.translationManager.getTranslation("importSuccess"));
                UIManager.updateHistoryDisplay();
            } catch (error) {
                console.error("Error importing CSV:", error);
                alert(this.translationManager.getTranslation("importError"));
            }
        };
        reader.readAsText(file);
    }

    async filterHistoryByTag(tag) {
        const history = JSON.parse(localStorage.getItem("passwordHistory")) || [];
        const filteredHistory = [];

        for (const entry of history) {
            const decryptedPassword = await this.cryptoManager.decrypt(entry.password);
            if (entry.tag.toLowerCase().includes(tag.toLowerCase())) {
                filteredHistory.push({ password: decryptedPassword, tag: entry.tag });
            }
        }

        return filteredHistory;
    }
}

class UIManager {
    constructor(cryptoManager, translationManager, passwordGenerator, historyManager) {
        this.cryptoManager = cryptoManager;
        this.translationManager = translationManager;
        this.passwordGenerator = passwordGenerator;
        this.historyManager = historyManager;
    }

    static initialize() {
        this.cryptoManager = new CryptoManager();
        this.translationManager = new TranslationManager();
        this.passwordGenerator = new PasswordGenerator(this.translationManager);
        this.historyManager = new HistoryManager(this.cryptoManager, this.translationManager);

        const app = new App(this.cryptoManager, this.translationManager, this.passwordGenerator, this.historyManager);
        app.initialize();
    }

    static addExportImportEventListeners() {
        // Eksport do KeePass
        document.getElementById("exportKeePass").addEventListener("click", () => {
            this.historyManager.exportToKeePass();
        });

        // Eksport do LastPass
        document.getElementById("exportLastPass").addEventListener("click", () => {
            this.historyManager.exportToLastPass();
        });

        // Import ustawień
        document.getElementById("importSettingsFile").addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                this.historyManager.importFromCSV(file);
                this.closeExportModal();
            }
        });
    }

    static addHistoryFilterListener() {
        const filterInput = document.getElementById("filterTag");
        filterInput.addEventListener("input", async (e) => {
            const tag = e.target.value.trim();
            if (tag === "") {
                // Wyświetl całą historię
                await this.updateHistoryDisplay();
            } else {
                const filteredHistory = await this.historyManager.filterHistoryByTag(tag);
                this.displayFilteredHistory(filteredHistory);
            }
        });
    }

    static addTutorialEventListener() {
        const tutorialButton = document.getElementById("tutorialButton");
        tutorialButton.addEventListener("click", () => {
            this.openTutorialModal();
        });
    }

    static openTutorialModal() {
        document.getElementById("tutorialModal").classList.remove("hidden");
    }

    static closeTutorialModal() {
        document.getElementById("tutorialModal").classList.add("hidden");
    }

    static openExportModal() {
        document.getElementById("exportModal").classList.remove("hidden");
    }

    static closeExportModal() {
        document.getElementById("exportModal").classList.add("hidden");
    }

    static closeSettingsModal() {
        document.getElementById("settingsModal").classList.add("hidden");
    }

    static updateLengthDisplay(value) {
        document.getElementById("lengthDisplay").textContent = value;
    }

    static changeTheme(theme) {
        const body = document.body;
        body.classList.remove("theme-default", "theme-dark", "theme-solarized");

        if (theme === "default") {
            body.classList.add("theme-default");
        } else if (theme === "dark") {
            body.classList.add("theme-dark");
        } else if (theme === "solarized") {
            body.classList.add("theme-solarized");
        }

        // Save preference to localStorage
        localStorage.setItem("theme", theme);
    }

    static applyCustomTheme() {
        const bgColor = document.getElementById("customBgColor").value;
        const textColor = document.getElementById("customTextColor").value;
        const borderColor = document.getElementById("customBorderColor").value;
        const shadowColor = document.getElementById("customShadowColor").value;

        // Tworzymy unikalną nazwę dla niestandardowego motywu
        const themeName = `custom-${Date.now()}`;

        // Dodajemy dynamiczny styl do dokumentu
        const style = document.createElement("style");
        style.innerHTML = `
            .${themeName} {
                --bg-color: ${bgColor};
                --text-color: ${textColor};
                --border-color: ${borderColor};
                --shadow-color: ${shadowColor};
            }
        `;
        document.head.appendChild(style);

        // Zastosowanie niestandardowego motywu
        const body = document.body;
        body.classList.remove("theme-default", "theme-dark", "theme-solarized", ...Array.from(body.classList).filter(cls => cls.startsWith("custom-")));
        body.classList.add(themeName);

        // Zapisujemy niestandardowy motyw w localStorage
        localStorage.setItem("theme", themeName);

        alert(this.translationManager.getTranslation("customThemeApplied"));
    }

    static async generatePassword(event) {
        event.preventDefault();
        const mode = document.getElementById("generationMode").value;
        const quantity = parseInt(document.getElementById("quantity").value);
        const length = parseInt(document.getElementById("passwordLength").value);

        // Validation
        if (!this.validateQuantity(quantity)) return;
        if (mode !== "pin" && !this.validatePasswordLength(length)) return;

        let settings = {
            length: length,
            includeUppercase: document.getElementById("includeUppercase").checked,
            includeNumbers: document.getElementById("includeNumbers").checked,
            includeSymbols: document.getElementById("includeSymbols").checked,
            pattern: document.getElementById("pattern").value.trim(),
            startWithLetter: document.getElementById("startWithLetter").checked,
            pinLength: parseInt(document.getElementById("pinLength").value)
        };

        // Wyczyść poprzednie błędy
        document.getElementById("patternError").classList.add("hidden");

        // Walidacja wzoru w trybie zaawansowanym
        if (mode === "advanced") {
            const patternValid = /^[L#!]+$/.test(settings.pattern);
            if (!patternValid) {
                document.getElementById("patternError").classList.remove("hidden");
                return;
            }
        }

        let output = "";
        let generatedCount = 0;

        for (let i = 0; i < quantity; i++) {
            await new Promise((resolve) => {
                this.passwordGenerator.generatePassword(mode, settings, async (password) => {
                    output += password + "\n";
                    await this.historyManager.saveToHistory(password);
                    generatedCount++;
                    resolve();
                });
            });
        }

        document.getElementById("passwordOutput").value = output.trim();

        if (mode !== "pin") {
            await this.evaluatePasswordStrength(output.trim());
        } else {
            document.getElementById("strengthContainer").classList.add("hidden");
        }
    }

    static validateQuantity(quantity) {
        if (isNaN(quantity) || quantity < 1 || quantity > 100) {
            alert(this.translationManager.getTranslation("quantityError"));
            return false;
        }
        return true;
    }

    static validatePasswordLength(length) {
        if (isNaN(length) || length < 8 || length > 32) {
            alert(this.translationManager.getTranslation("passwordLengthError"));
            return false;
        }
        return true;
    }

    static async evaluatePasswordStrength(password) {
        // Implementacja oceny siły hasła
        // Przykładowa implementacja
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const strengthBar = document.getElementById("strengthBar");
        const strengthText = document.getElementById("strengthText");
        const strengthSuggestion = document.getElementById("strengthSuggestion");

        if (strength <= 1) {
            strengthBar.style.width = "25%";
            strengthBar.style.backgroundColor = "#EF4444"; // Red-500
            strengthText.textContent = this.translationManager.getTranslation("weak");
            strengthSuggestion.textContent = this.translationManager.getTranslation("suggestion_length");
        } else if (strength === 2) {
            strengthBar.style.width = "50%";
            strengthBar.style.backgroundColor = "#F59E0B"; // Yellow-500
            strengthText.textContent = this.translationManager.getTranslation("medium");
            strengthSuggestion.textContent = this.translationManager.getTranslation("suggestion_uppercase");
        } else if (strength >= 3) {
            strengthBar.style.width = "100%";
            strengthBar.style.backgroundColor = "#10B981"; // Green-500
            strengthText.textContent = this.translationManager.getTranslation("strong");
            strengthSuggestion.textContent = this.translationManager.getTranslation("suggestion_symbols");
        }

        document.getElementById("strengthContainer").classList.remove("hidden");
    }

    static async copyToClipboard() {
        const passwordOutput = document.getElementById("passwordOutput").value;
        if (!passwordOutput) {
            alert(this.translationManager.getTranslation("copyError"));
            return;
        }
        try {
            await navigator.clipboard.writeText(passwordOutput);
            alert(this.translationManager.getTranslation("copySuccess"));
        } catch (err) {
            console.error("Failed to copy: ", err);
            alert(this.translationManager.getTranslation("copyError"));
        }
    }

    static async exportHistory() {
        // Możesz dodać dodatkowe funkcje eksportu, jeśli potrzebne
    }

    static async displayFilteredHistory(filteredHistory) {
        const historyList = document.getElementById("historyList");
        historyList.innerHTML = "";

        filteredHistory.forEach((entry, index) => {
            const listItem = document.createElement("li");
            listItem.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded";

            const passwordInfo = document.createElement("div");
            passwordInfo.className = "flex flex-col";
            passwordInfo.innerHTML = `
                <span class="font-medium">${entry.password}</span>
                ${entry.tag ? `<span class="text-sm text-gray-500 dark:text-gray-300">Tag: ${entry.tag}</span>` : ''}
            `;

            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 hover:text-red-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path id="deleteHistoryItemIcon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            deleteButton.onclick = () => this.historyManager.deleteHistoryItem(index);
            deleteButton.title = this.translationManager.getTranslation("clearHistory");

            listItem.appendChild(passwordInfo);
            listItem.appendChild(deleteButton);
            historyList.appendChild(listItem);
        });
    }

    static async updateHistoryDisplay() {
        const historyList = document.getElementById("historyList");
        historyList.innerHTML = "";
        const history = await this.historyManager.getHistory();

        history.forEach((entry, index) => {
            const listItem = document.createElement("li");
            listItem.className = "flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded";

            const passwordInfo = document.createElement("div");
            passwordInfo.className = "flex flex-col";
            passwordInfo.innerHTML = `
                <span class="font-medium">${entry.password}</span>
                ${entry.tag ? `<span class="text-sm text-gray-500 dark:text-gray-300">Tag: ${entry.tag}</span>` : ''}
            `;

            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 hover:text-red-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path id="deleteHistoryItemIcon2" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            deleteButton.onclick = () => this.historyManager.deleteHistoryItem(index);
            deleteButton.title = this.translationManager.getTranslation("clearHistory");

            listItem.appendChild(passwordInfo);
            listItem.appendChild(deleteButton);
            historyList.appendChild(listItem);
        });
    }

    static async addEventListeners() {
        // Formularz Generowania Haseł
        document.getElementById("passwordForm").addEventListener("submit", (e) => this.generatePassword(e));

        // Wybór Trybu Generowania
        document.getElementById("generationMode").addEventListener("change", (e) => {
            const mode = e.target.value;
            if (mode === "advanced") {
                document.getElementById("advancedOptions").classList.remove("hidden");
                document.getElementById("pinOptions").classList.add("hidden");
            } else if (mode === "pin") {
                document.getElementById("pinOptions").classList.remove("hidden");
                document.getElementById("advancedOptions").classList.add("hidden");
            } else {
                document.getElementById("advancedOptions").classList.add("hidden");
                document.getElementById("pinOptions").classList.add("hidden");
            }
        });

        // Wybór Motywu
        document.getElementById("themeSelector").addEventListener("change", (e) => {
            const theme = e.target.value;
            this.changeTheme(theme);
        });

        // Przyciski Modali
        document.getElementById("settingsButton").addEventListener("click", () => {
            document.getElementById("settingsModal").classList.remove("hidden");
        });

        // Obsługa importu z pliku w modalach
        document.getElementById("importSettingsFile").addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                this.historyManager.importFromCSV(file);
                this.closeExportModal();
            }
        });
    }

    static setupModalClose() {
        // Zamknięcie modali po kliknięciu poza zawartość modalu
        window.onclick = function(event) {
            const settingsModal = document.getElementById("settingsModal");
            const exportModal = document.getElementById("exportModal");
            const tutorialModal = document.getElementById("tutorialModal");
            if (event.target == settingsModal) {
                settingsModal.classList.add("hidden");
            }
            if (event.target == exportModal) {
                exportModal.classList.add("hidden");
            }
            if (event.target == tutorialModal) {
                tutorialModal.classList.add("hidden");
            }
        }
    }
}

class App {
    constructor(cryptoManager, translationManager, passwordGenerator, historyManager) {
        this.cryptoManager = cryptoManager;
        this.translationManager = translationManager;
        this.passwordGenerator = passwordGenerator;
        this.historyManager = historyManager;
        this.uiManager = UIManager;
    }

    async initialize() {
        await this.cryptoManager.initializeKey();
        await this.translationManager.loadTranslations();
        this.uiManager.initialize();
        this.uiManager.setupModalClose();
        await this.uiManager.updateHistoryDisplay();
        this.uiManager.addEventListeners();
        this.uiManager.addExportImportEventListeners();
        this.uiManager.addHistoryFilterListener();
        this.uiManager.addTutorialEventListener();
    }
}

// Inicjalizacja Aplikacji
document.addEventListener("DOMContentLoaded", () => {
    UIManager.initialize();
});

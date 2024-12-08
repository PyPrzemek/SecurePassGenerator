# Secure Password Generator

A web application for generating secure passwords with various configuration options.

## Features

- Generate standard passwords
- Generate advanced passwords based on a pattern
- Generate PINs
- Password strength evaluation
- Copy password to clipboard
- Save password generation history
- Export password history to KeePass and LastPass
- Toggle dark/light mode
- Change interface language (Polish/English)
- Save and load favorite settings

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/PyPrzemek/SecurePassGenerator.git
    ```
2. Navigate to the project directory:
    ```sh
    cd SecurePassGenerator
    ```
3. Install dependencies:
    ```sh
    npm install
    ```

## Usage

1. Start the application:
    ```sh
    npm start
    ```
2. Open your browser and go to `http://localhost:3000`.

## Project Structure

- `index.html` - Main HTML file of the application
- `app.js` - Application logic
- `locales/` - Translation files
  - `en.json` - English translations
  - `pl.json` - Polish translations
- `.gitignore` - Git ignore configuration file

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
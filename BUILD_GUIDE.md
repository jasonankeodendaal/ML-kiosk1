# Standalone Application Build Guide (Windows & Android)

This guide provides instructions for packaging the Interactive Kiosk System as a standalone desktop application for Windows (`.exe`) and a mobile application for Android (`.apk`).

## Table of Contents

1.  [**Prerequisites**](#prerequisites)
2.  [**Part 1: Building a Windows `.exe` with Electron**](#part-1-building-a-windows-exe-with-electron)
3.  [**Part 2: Building an Android `.apk` with Capacitor**](#part-2-building-an-android-apk-with-capacitor)

---

## Prerequisites

Before you begin, ensure you have the following installed on your main development computer:

1.  **Node.js:** If you haven't already, download and install the **LTS** version from [nodejs.org](https://nodejs.org/).
2.  **Code Editor:** A code editor like [Visual Studio Code](https://code.visualstudio.com/) is highly recommended.
3.  **Android Studio (for Android builds only):** Download and install the latest version of [Android Studio](https://developer.android.com/studio). This is required for building the Android app. Follow the on-screen setup instructions to install the necessary SDKs.

---

## Part 1: Building a Windows `.exe` with Electron

> **What is Electron?** Electron is a framework that lets you build cross-platform desktop apps with web technologies (HTML, CSS, JavaScript). It bundles your kiosk's web code with a lightweight browser (Chromium) into a single executable file.

### Step 1.1: Install Dependencies

Open a terminal in the root directory of your project and run the following command to install the required development packages:

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

### Step 1.2: Add Electron Configuration Files

We have already added the necessary configuration files for you:
- `electron.cjs`: This is the main script that tells Electron how to create the application window and load your kiosk.
- `package.json`: This file has been updated with the necessary scripts and build configurations.

**Note:** For a custom application icon, create an `assets` folder in the project root and add an icon file (e.g., `icon.ico`). Then, update the `build.win.icon` path in `package.json`.

### Step 1.3: Run in Development Mode (Optional)

To test the application in an Electron window before building, run:

```bash
npm run dev:electron
```

This will start the Vite development server and open an Electron window that loads your app, including hot-reloading.

### Step 1.4: Build the `.exe` File

When you are ready to create the final standalone executable, run the following command:

```bash
npm run build:electron
```

This command will first build the web assets, then package them into an installer (`.exe`) for Windows. The final files will be located in a new `release` folder in your project directory.

---

## Part 2: Building an Android `.apk` with Capacitor

> **What is Capacitor?** Capacitor is a tool that takes your web application and wraps it in a native Android (or iOS) project. This allows you to build a real native app that can be installed on mobile devices.

### Step 2.1: Install Capacitor Dependencies

Open a terminal in the root directory of your project and run the following command:

```bash
npm install @capacitor/cli @capacitor/core @capacitor/android
```

### Step 2.2: Initialize Capacitor

We have already added the Capacitor configuration file (`capacitor.config.ts`) for you. Now, initialize the Android platform by running:

```bash
npx cap add android
```
This will create a new `android` folder in your project. This is a complete, native Android project.

### Step 2.3: Build and Sync Your Web App

Before you can build the native app, you need to create an optimized build of your web code and copy it into the native project.

1.  **Build the web assets:**
    ```bash
    npm run build
    ```
    This creates a `dist` folder with your compiled web app.

2.  **Sync with Capacitor:**
    ```bash
    npx cap sync
    ```
    This command copies the contents of the `dist` folder into the Android project.

### Step 2.4: Build the APK in Android Studio

The final step is to open the native project in Android Studio and generate the `.apk` file.

1.  **Open the project in Android Studio:**
    ```bash
    npx cap open android
    ```
    This will launch Android Studio with your project loaded. Wait for it to finish indexing and syncing.

2.  **Generate a Signed APK:**
    - In the Android Studio menu, go to **Build > Generate Signed Bundle / APK...**.
    - Select **APK** and click **Next**.
    - You will be prompted to create or use a "Keystore". A keystore is a secure file that contains the digital signature for your app.
        - **If you don't have one:** Click **"Create new..."** and fill out the form. Remember the password you create and store the `.jks` file somewhere safe. You will need it to publish updates in the future.
        - **If you already have one:** Choose **"Choose existing..."** and locate your keystore file.
    - After selecting your keystore, choose a **"release"** build variant.
    - Click **Finish**.

Android Studio will now build your app. Once complete, it will show a notification with a link to locate the generated `app-release.apk` file. This is the file you can install on any Android device.

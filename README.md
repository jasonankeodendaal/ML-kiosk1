# Interactive Kiosk System - Full Setup Guide

Welcome to your Interactive Kiosk System. This guide provides complete, step-by-step instructions for every setup scenario. Please read the prerequisites and then follow the guide that best matches your needs.

## Table of Contents

1.  [**Prerequisites (Required for All Setups)**](#prerequisites-required-for-all-setups)
2.  [**The Definitive Guide: Cloud Sync Setup**](#the-definitive-guide-cloud-sync-setup) (Recommended for multiple devices)
3.  [**Alternative Setup: Single Offline Kiosk**](#alternative-setup-single-offline-kiosk)
4.  [**After Setup: Populating Your Content**](#after-setup-populating-your-content)
5.  [**Creating Standalone Applications (EXE/APK)**](#creating-standalone-applications-exeapk)

---

## Prerequisites (Required for All Setups)

You must complete these steps on your main computer before starting any setup guide.

### 1. Install Node.js

> **What is this?** Node.js is a standard web technology that lets your computer run a secure, local web server. This is required to run the kiosk application properly. You only need to do this once per computer.

1.  **Download:** Go to the official website [**nodejs.org**](https://nodejs.org/) and download the version labeled **"LTS"** (Long-Term Support).
2.  **Install:** Run the installer you downloaded. Accept all the default options by clicking "Next" through the setup.
3.  **Verify:** After installation, you need to check that it worked.
    *   On **Windows**, search for **"PowerShell"** in your Start Menu and open it.
    *   On **Mac**, open the **"Terminal"** app.
    *   In the window that appears, type the following command and press **Enter**:
        ```bash
        node -v
        ```
    *   If it's installed correctly, you will see a version number like `v20.11.0`.

---

## The Definitive Guide: Cloud Sync Setup

> **Use this for:** The most powerful setup. Manage a main admin PC and multiple display kiosks (PCs, Android tablets) across different locations, all synced together over the internet.

This guide is in three parts. You will have two terminal windows running on your main computer by the end.

### Part 1: Start Your Central Server (On Your Main PC)

This turns your main PC into the central "brain" for all your kiosks.

**Step 1.1: Open a Terminal in the Server Folder**
1.  Navigate into the `server` folder located in your main project directory.
2.  You need to open a terminal *inside this specific folder*.
    *   **Windows:** Hold the `Shift` key and Right-click inside the `server` folder. From the menu, choose **"Open PowerShell window here"** or **"Open in Terminal"**.
    *   **Mac:** Open the Terminal app. Type `cd ` (the letters `c`, `d`, and a space), then drag the `server` folder directly from your file manager into the terminal window. The path will appear automatically. Press **Enter**.

**Step 1.2: Install Server Dependencies**
1.  This command installs the tools your server needs to run. You only need to do this once.
2.  Copy and paste the following command into your terminal and press **Enter**:
    ```bash
    npm install
    ```

**Step 1.3: Create Your Secret API Key**
1.  In the `server` folder, find the file named **`.env.example`**.
2.  Rename this file to exactly **`.env`**.
3.  Open this new `.env` file with a simple text editor (like Notepad or TextEdit).
4.  Replace `your-super-secret-key-here` with a private password of your own. Make it secure.
5.  Save and close the `.env` file.

**Step 1.4: Start the Server**
1.  Go back to your terminal window.
2.  Copy and paste the following command and press **Enter**:
    ```bash
    node server.js
    ```
3.  You should see a message like `Server is running at http://localhost:3001`.
4.  **LEAVE THIS TERMINAL WINDOW OPEN.** It must stay running for the sync to work.

### Part 2: Make Your Server Publicly Accessible

> **What is this?** This step uses a free, secure tool called Cloudflare Tunnel to create a "bridge" from the public internet to the server running on your PC. This is the magic that lets your mobile devices find your main computer.

**Step 2.1: Install Cloudflare Tunnel**
1.  You only need to do this once per computer. Go to the official guide and follow the installation steps for your operating system:
    *   **[Cloudflare Tunnel Installation Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)**

**Step 2.2: Open a NEW Terminal Window**
1.  **This is important:** Do not close the first terminal. Open a second, completely new `PowerShell` or `Terminal` window.

**Step 2.3: Run the Tunnel**
1.  Copy and paste the following command into your **new** terminal window and press **Enter**:
    ```bash
    cloudflared tunnel --url http://localhost:3001
    ```

**Step 2.4: Get Your Public URL**
1.  After a few moments, the terminal will show you a public URL that looks something like this: **`https://random-words-and-letters.trycloudflare.com`**.
2.  **This is your public server address.** This is the most important piece of information. Copy it and save it somewhere safe, like a text file.
3.  **LEAVE THIS SECOND TERMINAL WINDOW OPEN.** Both the server and the tunnel must stay running on your main PC.

### Part 3: Configure All Your Kiosk Devices

> **Note:** You must repeat these steps on **every single device** you want to sync (your main PC, other PCs, and all your Android tablets).

**Step 3.1: Run the Kiosk App**
1.  On the device you are configuring, go to the main project folder (the one with `index.html`).
2.  Follow the steps from [Alternative Setup: Single Offline Kiosk](#alternative-setup-single-offline-kiosk) to start the app server and open it in a browser.

**Step 3.2: Log In as Admin**
1.  On the kiosk app screen, go to the footer and click **Admin Login**.
2.  The default PIN for the Main Admin is: **`1723`**

**Step 3.3: Enter Your Public URL and API Key**
1.  In the Admin Dashboard, navigate to: `Settings` > `API Integrations`.
2.  In the **"Custom API URL"** field, paste the public URL you got from Cloudflare in Part 2.
3.  **VERY IMPORTANT:** You must add **`/data`** to the end of the URL.
    *   Example: `https://random-words-and-letters.trycloudflare.com/data`
4.  In the **"Custom API Auth Key"** field, enter the exact same secret API Key you created in your `.env` file in Part 1.
5.  Click **Save Changes**.

**Step 3.4: Connect to the Storage Provider**
1.  Navigate to the `Storage` tab in the admin panel.
2.  Click the **"Connect"** button on the "Custom API Sync" card.

**Step 3.5: Do the First Sync (Critical Step!)**
1.  **On your main admin PC (the one with all your content):**
    *   Go to the `Cloud Sync` tab.
    *   Click the **"Push to Cloud"** button. This uploads all your local data to the server for the first time.
2.  **On all your other devices (mobile and other PCs):**
    *   Go to the `Cloud Sync` tab.
    *   Click the **"Pull from Cloud"** button. This will download all the master data from the server.

**Step 3.6: Enable Auto-Sync**
1.  On **every device**, go to `Settings` > `Kiosk Mode`.
2.  Find the **"Enable Auto-Sync"** toggle and turn it **ON**.

Your setup is now complete! Any change you make on your admin PC will automatically appear on all other connected devices within a few seconds.

---

## Alternative Setup: Single Offline Kiosk

> **Use this for:** A single computer or tablet where all data is stored on that one device. No internet is required after setup.

**Step 1: Start the Application Server**
1.  Open a terminal inside the main project folder (the one with `index.html`).
2.  Install the `serve` tool (you only do this once). Copy and paste this command and press Enter:
    ```bash
    npm install -g serve
    ```
3.  Start the server. Copy and paste this command and press Enter:
    ```bash
    serve .
    ```
4.  Your terminal will show a **"Local"** URL, usually `http://localhost:3000`. Copy this URL.

**Step 2: Use the Kiosk**
1.  Open a web browser (Chrome or Edge recommended) and paste the URL.
2.  Log in to the **Admin Dashboard** (footer link, PIN: `1723`) to add your content.
3.  **Important:** All data is saved in this specific browser. To prevent data loss, go to `Admin > Backup & Restore` and click **"Download Backup File"** regularly.

---

## After Setup: Populating Your Content

Once your storage is configured, it's time to add your own content.

1.  **Log in** to the Admin Panel on your main computer (default PIN: `1723`).
2.  Go to the various sections (**Brands**, **Catalogues**, etc.) and delete the sample data.
3.  **Add Your Brands First:** Go to the "Brands" tab and add all your brands.
4.  **Add Products:** Go back to the "Brands" tab, click on a brand to manage its products.
5.  **Use Bulk Import:** For large amounts of products, use the "Bulk Import Products" section on the "Brands" tab. You can upload a structured `.zip` file or a simple `.csv` file. Download the templates to see the required format.
6.  **Customize Appearance:** Go to `Settings` to change colors, fonts, logos, and layout to match your brand identity.
7.  If using Cloud Sync, your changes will automatically be sent to all other devices.

---

## Creating Standalone Applications (EXE/APK)

For instructions on how to package this kiosk as a standalone Windows `.exe` or an Android `.apk` file for offline distribution, please see the [**Standalone Application Build Guide](./BUILD_GUIDE.md)**.

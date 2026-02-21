# 🏢 Queue Master Enterprise

**Queue Master Enterprise** is an open-source, local-first queue management system. Designed for high-security or offline environments like banks, clinics, and government offices, it operates entirely within a Local Area Network (LAN). This ensures maximum privacy, speed, and reliability without any dependency on an internet connection.

---

## 📋 Prerequisites

Before installation, ensure your server machine has the following installed:

* **Java Development Kit (JDK):** Required for core Java components.
* **Node.js:** Necessary for the JavaScript runtime environment.
* **Local Network:** A router or switch to connect all devices (Admin, Teller, etc.).

---

## 🔧 Installation Guide

### Step 1: Install Java Development Kit (JDK)
1.  Download the latest JDK from the [Official Oracle Website](https://www.oracle.com/java/technologies/downloads/).
2.  Run the installer and complete the setup.
3.  **Set Environment Variables:** * Copy the installation path (e.g., `C:\Program Files\Java\jdk-XX`).
    * Add this path to your system's **Environment Variables** under `PATH` to enable global `java` commands.

### Step 2: Install Node.js
1.  Download Node.js from [nodejs.org](https://nodejs.org/).
2.  Follow the setup wizard instructions.
3.  **Verify installation:** Open a terminal and type:
    ```bash
    node -v
    ```

### Step 3: Prepare the System Folder
1.  Locate the system folder containing the Queue Master Enterprise files.
2.  Ensure you have **read/write permissions** for this directory.

### Step 4: Launch the Application
In the system folder, run the executable corresponding to your operating system:

| File | Description | Platform |
| :--- | :--- | :--- |
| **QueueMasterLauncher.exe** | Windows native executable | Windows |
| **QueueMasterLauncher.jar** | Cross-platform Java archive | Linux / macOS / Windows |

### Step 5: Network Connectivity
1.  Connect all devices (Admin, Teller, Receptionist, Monitor) to the **same local network**.
2.  No internet is required; the devices communicate via the local IP of the server.



---

## 🏢 System Components

| Component | Interface | Primary Function |
| :--- | :--- | :--- |
| **Admin Dashboard** | Local Host | Central control for managing queues and monitoring activity. |
| **Receptionist** | Client UI | Registers customers and issues physical/digital queue numbers. |
| **Teller Interface** | Client UI | Calls customers to the counter and updates ticket status. |
| **Monitor Display** | Public UI
# Queue Master Enterprise

Queue Master Enterprise is an open-source queue management system designed to operate on local servers or within the same network. Unlike web-based solutions, it runs independently of the internet, making it ideal for organizations such as banks, clinics, and offices that need efficient customer queue management.

## 📋 Prerequisites

Before installation, ensure you have the following:
- Java Development Kit (JDK)
- Node.js
- Local network connectivity for multi-device setup

## 🔧 Installation Guide

### Step 1: Install Java Development Kit (JDK)
1. Download the latest JDK from the [official Oracle website](https://www.oracle.com/java/technologies/downloads/)
2. Install the JDK on your computer
3. Copy the installation path (e.g., `C:\Program Files\Java\jdk-XX.X.X`)
4. Add the JDK path to your System Environment Variables for global Java command access

### Step 2: Install Node.js
1. Download Node.js from the [official Node.js website](https://nodejs.org/)
2. Run the installer and follow the setup instructions
3. Verify the installation by opening a command prompt and typing:
   ```bash
   node -v
This should display the installed version of Node.js

### Step 3: Prepare the Queue Master System Folder
Locate the system folder containing Queue Master Enterprise files

Ensure that all required files, including the launcher, are present

### Step 4: Launch the Application
In the system folder, run one of the following:

QueueMasterLauncher.exe (Windows executable)

QueueMasterLauncher.jar (Java archive, suitable for cross-platform use)

### Step 5: Connect Devices on the Same Network
Ensure that all devices (Admin, Teller, Receptionist, Monitor) are connected to the same local network

Each role can access its respective interface once the system is running

## 🏢 System Components
Admin Dashboard: Central control for managing queues and monitoring activity

Receptionist Interface: Registers customers and issues queue numbers

Teller Interface: Calls customers and updates queue status

Monitor Display: Shows real-time queue progress for customers

## ✨ Key Features
Local Operation: Runs independently without internet dependency

Multi-device Support: Connect multiple devices across different roles

Open Source: Freely customizable to fit specific organizational needs

Real-time Updates: Live queue status monitoring and updates

Role-based Interfaces: Dedicated interfaces for each operational role

## 🌐 Network Requirements
All devices must be connected to the same local network

No internet connection required for operation

Suitable for closed network environments

## 🔄 Customization
As an open-source system, Queue Master Enterprise can be modified and enhanced to meet your organization's specific requirements. Feel free to adapt the code and interfaces as needed.

## 📝 Notes
Queue Master Enterprise is not web-based; it runs entirely locally

Multiple devices can connect simultaneously as long as they are on the same network

All components must be on the same network for proper communication

Regular JDK and Node.js updates are recommended for optimal performance

Backup your configuration files before making custom modifications

Being open-source, the system can be customized to fit specific organizational needs
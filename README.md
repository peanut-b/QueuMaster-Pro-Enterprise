<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1HBiZdeV2Q6WbJqyB3RRAvMEtMXhMRuNV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Java Launcher (optional)

A desktop launcher is provided so you can start the app without using the terminal.

- **Run from JAR:** Install a JDK, then: `java -jar QueueMasterLauncher.jar`
- **Build EXE:** From the project folder run `build-exe.bat`. This compiles the Java launcher, creates `QueueMasterLauncher.jar`, and (if [Launch4j](https://launch4j.sourceforge.net/) is installed) produces `QueueMaster.exe`. Place and run the exe in this project folder so it can find `package.json` and run `npm run dev`.

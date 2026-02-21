import java.awt.*;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.StringSelection;
import java.io.*;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.URI;
import java.nio.file.*;
import java.util.*;
import javax.swing.*;
import java.awt.event.*;
import java.util.prefs.Preferences;

public class QueueMasterLauncher {
    private JFrame frame;
    private JTextArea consoleOutput;
    private JButton startButton;
    private JButton stopButton;
    private JButton installButton;
    private JButton settingsButton;
    private JButton clearHistoryButton;
    private JLabel statusLabel;
    private JPanel urlPanel;
    private JProgressBar progressBar;
    private Process nodeProcess;
    private boolean isRunning = false;
    
    // MODERN COLOR PALETTE
    private Color primaryColor = new Color(59, 130, 246);
    private Color successColor = new Color(34, 197, 94);
    private Color dangerColor = new Color(239, 68, 68);
    private Color secondaryColor = new Color(100, 116, 139);
    
    // Dark theme colors
    private Color darkBg = new Color(17, 24, 39);
    private Color darkerBg = new Color(11, 15, 25);
    private Color cardBg = new Color(31, 41, 55);
    private Color borderColor = new Color(55, 65, 81);
    private Color textSecondary = new Color(209, 213, 219);
    private Color textMuted = new Color(156, 163, 175);
    private Color hoverBg = new Color(55, 65, 81);
    
    // Preferences for localStorage
    private Preferences prefs;
    private static final String PREF_LAST_SESSION = "lastSession";
    private static final String PREF_LAST_NPM_PATH = "lastNpmPath";
    private static final String PREF_LAST_NETWORK_IP = "lastNetworkIP";
    private static final String PREF_LAUNCH_COUNT = "launchCount";
    private static final String PREF_AUDIO_ENABLED = "audioEnabled";
    private static final String PREF_AUTO_START = "autoStart";
    
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception e) {
                e.printStackTrace();
            }
            new QueueMasterLauncher().createAndShowGUI();
        });
    }
    
    public QueueMasterLauncher() {
        prefs = Preferences.userNodeForPackage(QueueMasterLauncher.class);
    }
    
    private void createAndShowGUI() {
        frame = new JFrame("QueueMaster Pro Enterprise v3.0");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(1000, 700);
        frame.setLayout(new BorderLayout());
        frame.setMinimumSize(new Dimension(900, 600));
        
        // USE STANDARD JFRAME DECORATIONS - NO CUSTOM TITLE BAR
        frame.setUndecorated(false);
        frame.setBackground(darkBg);
        
        // Set icon (optional; skip if not found to avoid NPE)
        try {
            java.net.URL iconUrl = getClass().getResource("/javax/swing/plaf/metal/icons/ocean/menu.gif");
            if (iconUrl != null) {
                ArrayList<Image> icons = new ArrayList<>();
                icons.add(new ImageIcon(iconUrl).getImage());
                frame.setIconImages(icons);
            }
        } catch (Exception e) {
            // Ignore icon errors
        }
        
        // Main content
        JPanel mainContent = new JPanel(new BorderLayout());
        mainContent.setBackground(darkBg);
        mainContent.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        
        // Header section
        mainContent.add(createHeader(), BorderLayout.NORTH);
        
        // Center panel
        JPanel centerPanel = new JPanel(new BorderLayout(10, 10));
        centerPanel.setBackground(darkBg);
        centerPanel.add(createConsolePanel(), BorderLayout.CENTER);
        centerPanel.add(createURLPanel(), BorderLayout.SOUTH);
        
        mainContent.add(centerPanel, BorderLayout.CENTER);
        mainContent.add(createStatusBar(), BorderLayout.SOUTH);
        
        frame.add(mainContent, BorderLayout.CENTER);
        
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
        
        SwingUtilities.invokeLater(() -> {
            loadSavedData();
            checkAndInstallDependencies();
            incrementLaunchCount();
        });
    }
    
    private JPanel createHeader() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(darkBg);
        header.setBorder(BorderFactory.createEmptyBorder(0, 0, 20, 0));
        
        JPanel titlePanel = new JPanel(new GridBagLayout());
        titlePanel.setBackground(darkBg);
        
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0; gbc.gridy = 0; gbc.anchor = GridBagConstraints.WEST;
        
        JLabel mainTitle = new JLabel("QueueMaster Pro");
        mainTitle.setFont(new Font("Segoe UI", Font.BOLD, 32));
        mainTitle.setForeground(Color.WHITE);
        titlePanel.add(mainTitle, gbc);
        
        gbc.gridy = 1;
        JLabel subtitle = new JLabel("Enterprise Queuing System Launcher");
        subtitle.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        subtitle.setForeground(textSecondary);
        titlePanel.add(subtitle, gbc);
        
        JPanel statsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 0));
        statsPanel.setBackground(darkBg);
        
        int launchCount = prefs.getInt(PREF_LAUNCH_COUNT, 0);
        statsPanel.add(createStatCard("Launches", String.valueOf(launchCount)));
        statsPanel.add(createStatCard("Network", getNetworkIP()));
        
        header.add(titlePanel, BorderLayout.WEST);
        header.add(statsPanel, BorderLayout.EAST);
        
        return header;
    }
    
    private JPanel createStatCard(String label, String value) {
        JPanel card = new JPanel(new BorderLayout());
        card.setBackground(cardBg);
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, 1),
            BorderFactory.createEmptyBorder(10, 15, 10, 15)
        ));
        
        JPanel textPanel = new JPanel(new GridLayout(2, 1));
        textPanel.setOpaque(false);
        
        JLabel labelLabel = new JLabel(label);
        labelLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        labelLabel.setForeground(textSecondary);
        
        JLabel valueLabel = new JLabel(value);
        valueLabel.setFont(new Font("Segoe UI", Font.BOLD, 13));
        valueLabel.setForeground(Color.WHITE);
        
        textPanel.add(labelLabel);
        textPanel.add(valueLabel);
        card.add(textPanel, BorderLayout.CENTER);
        
        return card;
    }
    
    private JPanel createConsolePanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(cardBg);
        panel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, 1),
            BorderFactory.createEmptyBorder(20, 20, 20, 20)
        ));
        
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);
        headerPanel.setBorder(BorderFactory.createEmptyBorder(0, 0, 15, 0));
        
        JLabel headerLabel = new JLabel("Console Output");
        headerLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        headerLabel.setForeground(Color.WHITE);
        
        JPanel buttonGroup = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        buttonGroup.setOpaque(false);
        
        // ========== STANDARD JAVA BUTTONS ==========
        installButton = new JButton("Install");
        installButton.setFont(new Font("Segoe UI", Font.BOLD, 12));
        installButton.setForeground(Color.BLACK);
        installButton.setBackground(new Color(240, 240, 240));
        installButton.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        installButton.setFocusPainted(false);
        installButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        installButton.addActionListener(e -> installDependencies());
        
        startButton = new JButton("Start");
        startButton.setFont(new Font("Segoe UI", Font.BOLD, 12));
        startButton.setForeground(Color.BLACK);
        startButton.setBackground(new Color(240, 240, 240));
        startButton.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        startButton.setFocusPainted(false);
        startButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        startButton.addActionListener(e -> startServer());
        
        stopButton = new JButton("Stop");
        stopButton.setFont(new Font("Segoe UI", Font.BOLD, 12));
        stopButton.setForeground(Color.BLACK);
        stopButton.setBackground(new Color(240, 240, 240));
        stopButton.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        stopButton.setFocusPainted(false);
        stopButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        stopButton.setEnabled(false);
        stopButton.addActionListener(e -> stopServer());
        
        clearHistoryButton = new JButton("Clear");
        clearHistoryButton.setFont(new Font("Segoe UI", Font.BOLD, 12));
        clearHistoryButton.setForeground(Color.BLACK);
        clearHistoryButton.setBackground(new Color(240, 240, 240));
        clearHistoryButton.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        clearHistoryButton.setFocusPainted(false);
        clearHistoryButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        clearHistoryButton.addActionListener(e -> clearConsole());
        
        settingsButton = new JButton("Settings");
        settingsButton.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        settingsButton.setForeground(Color.BLACK);
        settingsButton.setBackground(new Color(240, 240, 240));
        settingsButton.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 12, 8, 12)
        ));
        settingsButton.setFocusPainted(false);
        settingsButton.setCursor(new Cursor(Cursor.HAND_CURSOR));
        settingsButton.addActionListener(e -> showSettingsDialog());
        
        buttonGroup.add(installButton);
        buttonGroup.add(startButton);
        buttonGroup.add(stopButton);
        buttonGroup.add(clearHistoryButton);
        buttonGroup.add(settingsButton);
        
        headerPanel.add(headerLabel, BorderLayout.WEST);
        headerPanel.add(buttonGroup, BorderLayout.EAST);
        
        consoleOutput = new JTextArea();
        consoleOutput.setEditable(false);
        consoleOutput.setFont(new Font("Consolas", Font.PLAIN, 12));
        consoleOutput.setBackground(darkerBg);
        consoleOutput.setForeground(textSecondary);
        consoleOutput.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));
        
        JScrollPane scrollPane = new JScrollPane(consoleOutput);
        scrollPane.setBorder(null);
        scrollPane.getViewport().setBackground(darkerBg);
        
        panel.add(headerPanel, BorderLayout.NORTH);
        panel.add(scrollPane, BorderLayout.CENTER);
        
        return panel;
    }
    
    private JPanel createURLPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(cardBg);
        panel.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, 1),
            BorderFactory.createEmptyBorder(20, 20, 20, 20)
        ));
        
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setOpaque(false);
        headerPanel.setBorder(BorderFactory.createEmptyBorder(0, 0, 15, 0));
        
        JLabel headerLabel = new JLabel("Access URLs (Click to Open)");
        headerLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        headerLabel.setForeground(Color.WHITE);
        
        JLabel storageLabel = new JLabel("Local Storage Active");
        storageLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        storageLabel.setForeground(successColor);
        
        headerPanel.add(headerLabel, BorderLayout.WEST);
        headerPanel.add(storageLabel, BorderLayout.EAST);
        
        urlPanel = new JPanel(new GridLayout(1, 2, 20, 0));
        urlPanel.setBackground(cardBg);
        urlPanel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        
        String savedNetworkIP = prefs.get(PREF_LAST_NETWORK_IP, null);
        if (savedNetworkIP != null) {
            String savedURL = "http://" + savedNetworkIP + ":3000";
            addURLCard(urlPanel, "Localhost", "http://localhost:3000");
            addURLCard(urlPanel, "Network", savedURL);
        } else {
            addURLPlaceholder("Localhost", "Click Start to generate URL");
            addURLPlaceholder("Network", "Click Start to generate URL");
        }
        
        panel.add(headerPanel, BorderLayout.NORTH);
        panel.add(urlPanel, BorderLayout.CENTER);
        
        return panel;
    }
    
    private void addURLCard(JPanel parent, String title, String url) {
        JPanel container = new JPanel(new BorderLayout());
        container.setBackground(cardBg);
        container.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, 1),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));
        
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(cardBg);
        
        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 13));
        titleLabel.setForeground(Color.WHITE);
        
        JLabel actionLabel = new JLabel("Click to open • Double-click to copy");
        actionLabel.setFont(new Font("Segoe UI", Font.PLAIN, 10));
        actionLabel.setForeground(textSecondary);
        
        headerPanel.add(titleLabel, BorderLayout.WEST);
        headerPanel.add(actionLabel, BorderLayout.EAST);
        
        JTextArea urlField = new JTextArea(url);
        urlField.setEditable(false);
        urlField.setFont(new Font("Consolas", Font.PLAIN, 12));
        urlField.setBackground(cardBg);
        urlField.setForeground(primaryColor);
        urlField.setBorder(BorderFactory.createEmptyBorder(5, 0, 0, 0));
        urlField.setLineWrap(true);
        urlField.setWrapStyleWord(true);
        
        container.add(headerPanel, BorderLayout.NORTH);
        container.add(urlField, BorderLayout.CENTER);
        
        container.setCursor(new Cursor(Cursor.HAND_CURSOR));
        container.addMouseListener(new MouseAdapter() {
            public void mouseClicked(MouseEvent evt) {
                if (evt.getClickCount() == 2) {
                    copyToClipboard(url);
                    JOptionPane.showMessageDialog(frame,
                        "URL copied to clipboard:\n" + url,
                        "Copied",
                        JOptionPane.INFORMATION_MESSAGE);
                    return;
                }
                openBrowser(url);
                JOptionPane.showMessageDialog(frame,
                    "Opening in browser:\n" + url,
                    "Opening Browser",
                    JOptionPane.INFORMATION_MESSAGE);
            }
            public void mousePressed(MouseEvent evt) {
                // Double-click handled in mouseClicked
            }
            public void mouseEntered(MouseEvent evt) {
                container.setBackground(hoverBg);
                urlField.setBackground(hoverBg);
                headerPanel.setBackground(hoverBg);
            }
            public void mouseExited(MouseEvent evt) {
                container.setBackground(cardBg);
                urlField.setBackground(cardBg);
                headerPanel.setBackground(cardBg);
            }
        });
        
        parent.add(container);
    }
    
    private void openBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported()) {
                Desktop desktop = Desktop.getDesktop();
                if (desktop.isSupported(Desktop.Action.BROWSE)) {
                    desktop.browse(new URI(url));
                    return;
                }
            }
            String os = System.getProperty("os.name").toLowerCase();
            if (os.contains("win")) {
                Runtime.getRuntime().exec("rundll32 url.dll,FileProtocolHandler " + url);
            } else if (os.contains("mac")) {
                Runtime.getRuntime().exec("open " + url);
            } else {
                Runtime.getRuntime().exec("xdg-open " + url);
            }
        } catch (Exception e) {
            appendToConsole("Cannot open browser: " + e.getMessage() + "\n");
            copyToClipboard(url);
        }
    }
    
    private JPanel createStatusBar() {
        JPanel statusBar = new JPanel(new BorderLayout());
        statusBar.setBackground(cardBg);
        statusBar.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createMatteBorder(1, 0, 0, 0, borderColor),
            BorderFactory.createEmptyBorder(12, 15, 12, 15)
        ));
        
        JPanel statusIndicator = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        statusIndicator.setOpaque(false);
        
        statusLabel = new JLabel("Ready");
        statusLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        statusLabel.setForeground(textSecondary);
        statusIndicator.add(statusLabel);
        
        progressBar = new JProgressBar();
        progressBar.setIndeterminate(false);
        progressBar.setPreferredSize(new Dimension(120, 4));
        progressBar.setBorderPainted(false);
        progressBar.setForeground(primaryColor);
        progressBar.setBackground(borderColor);
        statusIndicator.add(progressBar);
        
        JPanel infoPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 0));
        infoPanel.setOpaque(false);
        
        JLabel storageLabel = new JLabel("Session data saved");
        storageLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        storageLabel.setForeground(successColor);
        
        JLabel lastSessionLabel = new JLabel(getLastSessionInfo());
        lastSessionLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        lastSessionLabel.setForeground(textSecondary);
        
        infoPanel.add(storageLabel);
        infoPanel.add(lastSessionLabel);
        
        statusBar.add(statusIndicator, BorderLayout.WEST);
        statusBar.add(infoPanel, BorderLayout.EAST);
        
        return statusBar;
    }
    
    // ============== LOCAL STORAGE METHODS ==============
    
    private void saveSessionData() {
        try {
            prefs.put(PREF_LAST_SESSION, new Date().toString());
            String networkIP = getNetworkIP();
            if (networkIP != null && !networkIP.equals("192.168.1.100")) {
                prefs.put(PREF_LAST_NETWORK_IP, networkIP);
            }
            String npmPath = findNpmPath();
            if (npmPath != null) prefs.put(PREF_LAST_NPM_PATH, npmPath);
            appendToConsole("Session data saved to local storage\n");
        } catch (Exception e) {
            appendToConsole("Failed to save session data: " + e.getMessage() + "\n");
        }
    }
    
    private void loadSavedData() {
        try {
            String lastSession = prefs.get(PREF_LAST_SESSION, null);
            if (lastSession != null) appendToConsole("Last session: " + lastSession + "\n");
            String lastNetworkIP = prefs.get(PREF_LAST_NETWORK_IP, null);
            if (lastNetworkIP != null) appendToConsole("Saved network IP: " + lastNetworkIP + "\n");
            boolean autoStart = prefs.getBoolean(PREF_AUTO_START, false);
            if (autoStart) {
                appendToConsole("Auto-start enabled. Starting server...\n");
                SwingUtilities.invokeLater(() -> startServer());
            }
        } catch (Exception e) {
            appendToConsole("Failed to load session data: " + e.getMessage() + "\n");
        }
    }
    
    private void incrementLaunchCount() {
        int count = prefs.getInt(PREF_LAUNCH_COUNT, 0);
        count++;
        prefs.putInt(PREF_LAUNCH_COUNT, count);
        appendToConsole("Launch count: " + count + "\n");
    }
    
    private String getLastSessionInfo() {
        String lastSession = prefs.get(PREF_LAST_SESSION, null);
        if (lastSession != null) {
            try {
                String timePart = lastSession.split(" ")[3];
                return "Last: " + timePart;
            } catch (Exception e) {
                return "Last session saved";
            }
        }
        return "First launch";
    }
    
    private void showSettingsDialog() {
        JDialog dialog = new JDialog(frame, "Settings", true);
        dialog.setSize(400, 350);
        dialog.setLocationRelativeTo(frame);
        dialog.setLayout(new BorderLayout());
        
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        panel.setBackground(cardBg);
        
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.gridx = 0; gbc.gridy = 0;
        gbc.anchor = GridBagConstraints.WEST;
        gbc.insets = new Insets(5, 5, 5, 5);
        
        JCheckBox autoStartCheck = new JCheckBox("Auto-start server on launch");
        autoStartCheck.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        autoStartCheck.setBackground(cardBg);
        autoStartCheck.setForeground(Color.WHITE);
        autoStartCheck.setSelected(prefs.getBoolean(PREF_AUTO_START, false));
        autoStartCheck.addActionListener(e -> prefs.putBoolean(PREF_AUTO_START, autoStartCheck.isSelected()));
        panel.add(autoStartCheck, gbc);
        
        gbc.gridy = 1;
        JCheckBox audioEnabledCheck = new JCheckBox("Enable announcement sounds");
        audioEnabledCheck.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        audioEnabledCheck.setBackground(cardBg);
        audioEnabledCheck.setForeground(Color.WHITE);
        audioEnabledCheck.setSelected(prefs.getBoolean(PREF_AUDIO_ENABLED, true));
        audioEnabledCheck.addActionListener(e -> prefs.putBoolean(PREF_AUDIO_ENABLED, audioEnabledCheck.isSelected()));
        panel.add(audioEnabledCheck, gbc);
        
        gbc.gridy = 2;
        gbc.insets = new Insets(20, 5, 5, 5);
        JButton clearDataBtn = new JButton("Clear Saved Data");
        clearDataBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        clearDataBtn.setForeground(Color.BLACK);
        clearDataBtn.setBackground(new Color(240, 240, 240));
        clearDataBtn.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        clearDataBtn.setFocusPainted(false);
        clearDataBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        clearDataBtn.addActionListener(e -> {
            int confirm = JOptionPane.showConfirmDialog(dialog,
                "Clear all saved data?", "Confirm", JOptionPane.YES_NO_OPTION);
            if (confirm == JOptionPane.YES_OPTION) {
                try {
                    prefs.clear();
                    appendToConsole("Local storage cleared\n");
                    dialog.dispose();
                } catch (Exception ex) {
                    appendToConsole("Failed to clear: " + ex.getMessage() + "\n");
                }
            }
        });
        panel.add(clearDataBtn, gbc);
        
        gbc.gridy = 3;
        gbc.insets = new Insets(10, 5, 5, 5);
        JButton closeBtn = new JButton("Close");
        closeBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        closeBtn.setForeground(Color.BLACK);
        closeBtn.setBackground(new Color(240, 240, 240));
        closeBtn.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(200, 200, 200), 1),
            BorderFactory.createEmptyBorder(8, 20, 8, 20)
        ));
        closeBtn.setFocusPainted(false);
        closeBtn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        closeBtn.addActionListener(e -> dialog.dispose());
        panel.add(closeBtn, gbc);
        
        dialog.add(panel, BorderLayout.CENTER);
        dialog.setVisible(true);
    }
    
    private void clearConsole() {
        consoleOutput.setText("");
        appendToConsole("Console cleared\n");
    }
    
    // ============== EXISTING FUNCTIONAL METHODS ==============
    
    private void checkAndInstallDependencies() {
        Path nodeModules = Paths.get("node_modules");
        if (!Files.exists(nodeModules)) {
            appendToConsole("node_modules not found. Installing dependencies...\n");
            installDependencies();
        } else {
            appendToConsole("node_modules found. Ready to start server.\n");
        }
    }
    
    private void installDependencies() {
        executeCommand("install", "Installing dependencies...");
    }
    
    private String findNpmPath() {
        // 1. Try npm/npm.cmd in PATH (works when launched from terminal)
        for (String cmd : new String[]{"npm.cmd", "npm"}) {
            try {
                ProcessBuilder pb = new ProcessBuilder(cmd, "--version");
                pb.redirectErrorStream(true);
                pb.redirectError(ProcessBuilder.Redirect.DISCARD);
                Process p = pb.start();
                int exitCode = p.waitFor();
                if (exitCode == 0) return cmd;
            } catch (Exception e) {}
        }
        
        // 2. Search common Node.js install locations (works when PATH is limited, e.g. double-click)
        String programFiles = System.getenv("ProgramFiles");
        String programFilesX86 = System.getenv("ProgramFiles(x86)");
        String appData = System.getenv("APPDATA");
        String localAppData = System.getenv("LOCALAPPDATA");
        
        String[] npmPaths = {
            "C:\\Program Files\\nodejs\\npm.cmd",
            "C:\\Program Files (x86)\\nodejs\\npm.cmd",
            (programFiles != null ? programFiles + "\\nodejs\\npm.cmd" : null),
            (programFilesX86 != null ? programFilesX86 + "\\nodejs\\npm.cmd" : null),
            (localAppData != null ? localAppData + "\\Programs\\nodejs\\npm.cmd" : null),
            (appData != null ? appData + "\\npm\\npm.cmd" : null)
        };
        
        for (String path : npmPaths) {
            if (path != null && new File(path).exists()) return path;
        }
        
        // 3. Find node.exe, then look for npm.cmd in same directory
        String[] nodePaths = {
            "C:\\Program Files\\nodejs\\node.exe",
            "C:\\Program Files (x86)\\nodejs\\node.exe",
            (programFiles != null ? programFiles + "\\nodejs\\node.exe" : null),
            (programFilesX86 != null ? programFilesX86 + "\\nodejs\\node.exe" : null)
        };
        for (String nodePath : nodePaths) {
            if (nodePath != null) {
                File nodeFile = new File(nodePath);
                if (nodeFile.exists()) {
                    File npmFile = new File(nodeFile.getParent(), "npm.cmd");
                    if (npmFile.exists()) return npmFile.getAbsolutePath();
                    npmFile = new File(nodeFile.getParent(), "npm");
                    if (npmFile.exists()) return npmFile.getAbsolutePath();
                }
            }
        }
        
        // 4. Try "where node" / "where npm" via cmd (in case PATH works for cmd)
        for (String cmd : new String[]{"where npm", "where node"}) {
            try {
                ProcessBuilder pb = new ProcessBuilder("cmd", "/c", cmd);
                pb.redirectErrorStream(true);
                Process p = pb.start();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                    String line = r.readLine();
                    if (line != null && !line.isEmpty() && !line.contains("INFO:")) {
                        line = line.trim();
                        if (line.endsWith("npm.cmd") || line.endsWith("npm")) return line;
                        if (line.endsWith("node.exe")) {
                            File npmFile = new File(new File(line).getParent(), "npm.cmd");
                            if (npmFile.exists()) return npmFile.getAbsolutePath();
                        }
                    }
                }
                p.waitFor();
            } catch (Exception e) {}
        }
        
        return null;
    }
    
    /** Get Node.js install directory from npm path, so we can add it to PATH for child processes. */
    private String getNodeDirectory(String npmPath) {
        if (npmPath == null) return null;
        File f = new File(npmPath);
        if (f.isAbsolute() && f.exists()) return f.getParent();
        try {
            ProcessBuilder pb = new ProcessBuilder("cmd", "/c", "where node");
            pb.redirectErrorStream(true);
            Process p = pb.start();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line = r.readLine();
                if (line != null && !line.isEmpty() && line.contains("node")) {
                    File nodeExe = new File(line.trim());
                    if (nodeExe.exists()) return nodeExe.getParent();
                }
            }
            p.waitFor();
        } catch (Exception e) {}
        return null;
    }
    
    /** Add Node.js directory to PATH in ProcessBuilder so install scripts can find 'node'. */
    private void addNodeToPath(ProcessBuilder pb, String npmPath) {
        String nodeDir = getNodeDirectory(npmPath);
        if (nodeDir == null) return;
        java.util.Map<String, String> env = pb.environment();
        String path = env.get("PATH");
        env.put("PATH", nodeDir + File.pathSeparator + (path != null ? path : ""));
    }
    
    /** Get the directory where the app (JAR or exe) lives, for use as working directory. */
    private File getAppDirectory() {
        try {
            java.security.ProtectionDomain pd = getClass().getProtectionDomain();
            if (pd != null && pd.getCodeSource() != null && pd.getCodeSource().getLocation() != null) {
                java.net.URI uri = pd.getCodeSource().getLocation().toURI();
                Path path = Paths.get(uri);
                if (Files.isRegularFile(path)) path = path.getParent();
                if (path != null) return path.toAbsolutePath().toFile();
            }
        } catch (Exception e) {}
        return new File(System.getProperty("user.dir"));
    }
    
    private void addURLPlaceholder(String title, String url) {
        JPanel container = new JPanel(new BorderLayout());
        container.setBackground(cardBg);
        container.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(borderColor, 1),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));
        
        JLabel titleLabel = new JLabel(title);
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 12));
        titleLabel.setForeground(textSecondary);
        
        JTextArea urlField = new JTextArea(url);
        urlField.setEditable(false);
        urlField.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        urlField.setBackground(cardBg);
        urlField.setForeground(textMuted);
        urlField.setBorder(BorderFactory.createEmptyBorder(5, 0, 0, 0));
        urlField.setLineWrap(true);
        urlField.setWrapStyleWord(true);
        
        container.add(titleLabel, BorderLayout.NORTH);
        container.add(urlField, BorderLayout.CENTER);
        urlPanel.add(container);
    }
    
    private void displayURL(String url, String title) {
        SwingUtilities.invokeLater(() -> {
            urlPanel.removeAll();
            try {
                String ip = url.replace("http://", "").replace(":3000", "");
                prefs.put(PREF_LAST_NETWORK_IP, ip);
            } catch (Exception e) {}
            addURLCard(urlPanel, "Localhost", "http://localhost:3000");
            addURLCard(urlPanel, "Network", url);
            urlPanel.revalidate();
            urlPanel.repaint();
        });
    }
    
    private void startServer() {
        // PREVENT MULTIPLE SERVER INSTANCES
        if (isRunning) {
            appendToConsole("Server is already running\n");
            return;
        }
        
        new Thread(() -> {
            try {
                isRunning = true;
                SwingUtilities.invokeLater(() -> {
                    startButton.setEnabled(false);
                    stopButton.setEnabled(true);
                    statusLabel.setText("Running");
                    statusLabel.setForeground(successColor);
                    progressBar.setIndeterminate(true);
                    appendToConsole("Starting server...\n");
                });
                
                String networkIP = getNetworkIP();
                String networkURL = "http://" + networkIP + ":3000";
                displayURL(networkURL, "Network");
                
                String npmPath = findNpmPath();
                if (npmPath == null) {
                    SwingUtilities.invokeLater(() -> {
                        appendToConsole("Cannot start server: npm not found\n");
                        appendToConsole("Please install Node.js from: https://nodejs.org/\n");
                        startButton.setEnabled(true);
                        stopButton.setEnabled(false);
                        statusLabel.setText("Error");
                        statusLabel.setForeground(dangerColor);
                        progressBar.setIndeterminate(false);
                        isRunning = false;
                    });
                    return;
                }
                
                // Kill existing process if any
                if (nodeProcess != null && nodeProcess.isAlive()) {
                    stopServer();
                    Thread.sleep(1000); // Wait for clean shutdown
                }
                
                ProcessBuilder pb = new ProcessBuilder(npmPath, "run", "dev");
                pb.directory(getAppDirectory());
                addNodeToPath(pb, npmPath);
                pb.redirectErrorStream(false);
                
                nodeProcess = pb.start();
                
                readStream(nodeProcess.getInputStream(), false);
                readStream(nodeProcess.getErrorStream(), true);
                
                int exitCode = nodeProcess.waitFor();
                
                // DON'T SHOW ERROR FOR NORMAL TERMINATION
                if (exitCode != 0 && exitCode != 1) {
                    appendToConsole("Server stopped with exit code: " + exitCode + "\n");
                }
                
            } catch (Exception e) {
                appendToConsole("Error: " + e.getMessage() + "\n");
                e.printStackTrace();
            } finally {
                isRunning = false;
                SwingUtilities.invokeLater(() -> {
                    startButton.setEnabled(true);
                    stopButton.setEnabled(false);
                    statusLabel.setText("Stopped");
                    statusLabel.setForeground(textSecondary);
                    progressBar.setIndeterminate(false);
                });
                saveSessionData();
                
                // KEEP URLs VISIBLE - DON'T REMOVE THEM
                // The web app will auto-reconnect via WebSocket
            }
        }).start();
    }
    
    private void stopServer() {
        if (nodeProcess != null && nodeProcess.isAlive()) {
            appendToConsole("Stopping server...\n");
            
            try {
                // Graceful shutdown first
                if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                    Runtime.getRuntime().exec("taskkill /F /T /PID " + nodeProcess.pid());
                } else {
                    nodeProcess.destroy(); // Try graceful shutdown
                    Thread.sleep(1000);
                    if (nodeProcess.isAlive()) {
                        nodeProcess.destroyForcibly(); // Force if still alive
                    }
                }
            } catch (Exception e) {
                nodeProcess.destroyForcibly();
            }
            
            nodeProcess = null;
            appendToConsole("Server stopped\n");
            saveSessionData();
            
            // DON'T REMOVE URLs - Keep them visible for reconnection
            // The web app's WebSocket will automatically reconnect when server starts again
        }
    }
    
    private void executeCommand(String command, String message) {
        new Thread(() -> {
            try {
                SwingUtilities.invokeLater(() -> {
                    appendToConsole(message + "\n");
                    statusLabel.setText(" " + message);
                    progressBar.setIndeterminate(true);
                });
                
                String npmPath = findNpmPath();
                if (npmPath == null) {
                    SwingUtilities.invokeLater(() -> {
                        appendToConsole("npm not found. Install Node.js\n");
                        statusLabel.setText("Error");
                        statusLabel.setForeground(dangerColor);
                        progressBar.setIndeterminate(false);
                    });
                    return;
                }
                
                ProcessBuilder pb = new ProcessBuilder(npmPath, command);
                pb.directory(getAppDirectory());
                addNodeToPath(pb, npmPath);
                Process process = pb.start();
                
                readStream(process.getInputStream(), false);
                readStream(process.getErrorStream(), true);
                
                int exitCode = process.waitFor();
                
                SwingUtilities.invokeLater(() -> {
                    if (exitCode == 0) {
                        appendToConsole(message + " completed!\n");
                        statusLabel.setText("Ready");
                        statusLabel.setForeground(textSecondary);
                        if (command.equals("install")) prefs.put(PREF_LAST_NPM_PATH, npmPath);
                    } else {
                        appendToConsole(message + " failed: " + exitCode + "\n");
                        statusLabel.setText("Error");
                        statusLabel.setForeground(dangerColor);
                    }
                    progressBar.setIndeterminate(false);
                });
                
            } catch (Exception e) {
                appendToConsole("Error: " + e.getMessage() + "\n");
            }
        }).start();
    }
    
    private void readStream(InputStream inputStream, boolean isError) {
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    final String outputLine = line;
                    SwingUtilities.invokeLater(() -> {
                        if (isError) appendToConsole("x" + outputLine + "\n");
                        else appendToConsole(outputLine + "\n");
                    });
                }
            } catch (IOException e) { e.printStackTrace(); }
        }).start();
    }
    
    private void appendToConsole(String text) {
        consoleOutput.append(text);
        consoleOutput.setCaretPosition(consoleOutput.getDocument().getLength());
    }
    
    private String getNetworkIP() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr.getHostAddress().contains(":")) continue;
                    if (addr.isSiteLocalAddress()) return addr.getHostAddress();
                }
            }
        } catch (SocketException e) {
            appendToConsole("Network IP error: " + e.getMessage() + "\n");
        }
        try {
            InetAddress localhost = InetAddress.getLocalHost();
            String ip = localhost.getHostAddress();
            if (!ip.contains(":")) return ip;
        } catch (Exception e) {}
        return "192.168.1.100";
    }
    
    private void copyToClipboard(String text) {
        StringSelection selection = new StringSelection(text);
        Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
        clipboard.setContents(selection, selection);
    }
}


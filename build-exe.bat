@echo off
setlocal
cd /d "%~dp0"

echo Building QueueMaster Launcher...
echo Current folder: %CD%
echo.

:: Check for JDK
where javac >nul 2>&1
if errorlevel 1 (
    echo ERROR: javac not found. Install JDK and add it to PATH.
    echo Download: https://adoptium.net/ or https://www.oracle.com/java/technologies/downloads/
    goto :end
)

:: Compile Java
if not exist "out" mkdir out
echo Compiling Java...
javac -encoding UTF-8 -d out QueueMasterLauncher.java
if errorlevel 1 (
    echo ERROR: javac failed.
    goto :end
)

:: Create JAR (Main-Class in manifest via -e)
echo Creating JAR...
jar cfe QueueMasterLauncher.jar QueueMasterLauncher -C out .
if errorlevel 1 (
    echo ERROR: jar failed.
    goto :end
)

rd /s /q out 2>nul
echo JAR created: QueueMasterLauncher.jar
echo.

:: Build EXE with Launch4j if available
set L4J=
where launch4jc >nul 2>&1 && set L4J=launch4jc
if "%L4J%"=="" if exist "C:\Program Files (x86)\Launch4j\launch4jc.exe" set "L4J=C:\Program Files (x86)\Launch4j\launch4jc.exe"
if "%L4J%"=="" if exist "C:\Program Files\Launch4j\launch4jc.exe" set "L4J=C:\Program Files\Launch4j\launch4jc.exe"

if not "%L4J%"=="" (
    echo Building EXE with Launch4j...
    "%L4J%" launch4j-config.xml
    if errorlevel 1 (
        echo Launch4j failed. See above for errors.
    ) else (
        echo.
        echo Done. QueueMaster.exe was created in this folder.
    )
) else (
    echo Launch4j not found. JAR was built successfully.
    echo To create EXE: download Launch4j from https://launch4j.sourceforge.net/
    echo Then run: launch4jc launch4j-config.xml
    echo.
    echo You can run the launcher now: java -jar QueueMasterLauncher.jar
)

:end
echo.
pause
endlocal

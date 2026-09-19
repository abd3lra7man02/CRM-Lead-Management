@echo off
echo ==============================================================================
echo [RETRO-SDR BUILD SYSTEM] Packaging Standalone Windows .EXE via PyInstaller...
echo ==============================================================================

:: Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in PATH! Please install Python 3.10+ from python.org.
    pause
    exit /b 1
)

:: Install required dependencies
echo [1/3] Installing dependencies: customtkinter, fastapi, uvicorn, pydantic, pyinstaller...
pip install customtkinter fastapi uvicorn pydantic pyinstaller

:: Clean old build artifacts
echo [2/3] Cleaning previous build folders...
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

:: Run PyInstaller build using spec file
echo [3/3] Compiling standalone RetroSdrShiftHud.exe with bundled CustomTkinter & Uvicorn...
pyinstaller --clean retro_sdr_crm.spec

echo.
echo ==============================================================================
echo [SUCCESS] Build Complete! Standalone Windows executable generated at:
echo dist\RetroSdrShiftHud.exe
echo ==============================================================================
pause

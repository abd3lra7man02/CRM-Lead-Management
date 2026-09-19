@echo off
echo ========================================================
echo   Building SDR Shift CRM Standalone Windows Executable
echo ========================================================
echo.

:: 1. Verify Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH! Please install Python 3.10+ and check 'Add to PATH'.
    pause
    exit /b 1
)

:: 2. Create virtual environment if missing
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing required dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo [4/4] Compiling with PyInstaller...
pyinstaller --clean sdr_crm.spec

echo.
echo ========================================================
echo   BUILD COMPLETED SUCCESSFULLY!
echo   Executable located at: dist\SDR_Shift_CRM.exe
echo ========================================================
echo.
pause

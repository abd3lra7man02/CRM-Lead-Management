# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Spec Configuration for SDR Shift CRM & Mobile Bridge.
Builds a standalone Windows executable with CustomTkinter assets and
FastAPI / Uvicorn background daemon server bundled.
"""
import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# 1. Collect CustomTkinter themes, fonts, and assets
customtkinter_datas = collect_data_files('customtkinter')

# 2. Collect Uvicorn and FastAPI hidden imports (essential for dynamic protocol loaders)
uvicorn_hidden = collect_submodules('uvicorn')
fastapi_hidden = collect_submodules('fastapi')
pydantic_hidden = collect_submodules('pydantic')

hidden_imports = [
    'sqlite3',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespans',
    'uvicorn.lifespans.on',
    'uvicorn.lifespans.off',
    'customtkinter',
    'tkinter',
    'pydantic',
    'pydantic_core'
] + uvicorn_hidden + fastapi_hidden + pydantic_hidden

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=customtkinter_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SDR_Shift_CRM',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False to launch as pure GUI window (no black cmd box)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None  # Can provide 'app_icon.ico' if available
)

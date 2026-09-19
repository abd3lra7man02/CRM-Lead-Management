# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller Spec for RETRO-SDR // SYNTHWAVE SHIFT HUD
Packages CustomTkinter, FastAPI, Uvicorn, and SQLite into a single Windows .EXE
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect CustomTkinter theme JSON files and fonts
datas = collect_data_files('customtkinter')

# Collect Uvicorn, FastAPI, and Pydantic submodules so PyInstaller bundles them cleanly
hiddenimports = [
    'customtkinter',
    'fastapi',
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'pydantic',
    'sqlite3',
] + collect_submodules('uvicorn')

a = Analysis(
    ['retro_sdr_crm.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
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
    name='RetroSdrShiftHud',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False for native Windows window without background black CMD terminal
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None  # Can provide an .ico file here (e.g. icon='retro_icon.ico')
)

; NSIS Installer Hooks for TOOLS 33
; Installs Ghostscript automatically during setup

!macro NSIS_HOOK_PREINSTALL
  ; This runs before installing TOOLS 33 files
  DetailPrint "Preparing installation..."
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; This runs after TOOLS 33 files are installed
  DetailPrint "Installing Ghostscript (required component)..."
  
  ; Get the installation directory
  Push $INSTDIR
  
  ; Check if Ghostscript is already installed
  IfFileExists "$PROGRAMFILES64\gs\*.*" GhostscriptAlreadyInstalled
  IfFileExists "$PROGRAMFILES\gs\*.*" GhostscriptAlreadyInstalled
  
  ; Ghostscript installer path (bundled with TOOLS 33)
  ; The bundled file is extracted to $INSTDIR during installation
  IfFileExists "$INSTDIR\bundled\gs10070w64.exe" InstallGhostscript
  IfFileExists "$INSTDIR\bundled\ghostscript.exe" InstallGhostscriptAlt
  
  ; If bundled file not found, check other locations
  IfFileExists "$EXEDIR\gs10070w64.exe" InstallGhostscriptFromSource
  
  DetailPrint "Warning: Ghostscript installer not found in bundle"
  Goto GhostscriptDone
  
InstallGhostscript:
  DetailPrint "Installing Ghostscript 10.07.0..."
  ExecWait '"$INSTDIR\bundled\gs10070w64.exe" /S' $0
  DetailPrint "Ghostscript installation completed with code: $0"
  Goto GhostscriptDone
  
InstallGhostscriptAlt:
  DetailPrint "Installing Ghostscript..."
  ExecWait '"$INSTDIR\bundled\ghostscript.exe" /S' $0
  DetailPrint "Ghostscript installation completed with code: $0"
  Goto GhostscriptDone
  
InstallGhostscriptFromSource:
  DetailPrint "Installing Ghostscript from source directory..."
  ExecWait '"$EXEDIR\gs10070w64.exe" /S' $0
  DetailPrint "Ghostscript installation completed with code: $0"
  Goto GhostscriptDone
  
GhostscriptAlreadyInstalled:
  DetailPrint "Ghostscript already installed, skipping..."
  
GhostscriptDone:
  DetailPrint "Component installation complete."
  
  ; Refresh environment variables so Ghostscript is available immediately
  System::Call 'kernel32.dll::SendMessageTimeout(i 0xFFFF, i 0x001A, i 0, t "Environment", i 0x0002, i 5000, *i .r0) i.r1'
  
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; This runs before uninstalling TOOLS 33
  DetailPrint "Preparing uninstallation..."
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; This runs after uninstalling TOOLS 33
  DetailPrint "Cleaning up..."
  
  ; Note: We don't uninstall Ghostscript automatically because
  ; other applications might depend on it
  DetailPrint "Ghostscript has been left installed (shared component)"
!macroend

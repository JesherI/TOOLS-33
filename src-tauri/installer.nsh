; NSIS Installer Hooks for TOOLS 33
; Optional Ghostscript installation with user consent

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Preparing TOOLS 33 installation..."
!macroend

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "TOOLS 33 installation complete!"
  
  ; Check if Ghostscript is already installed
  IfFileExists "$PROGRAMFILES64\gs\gs10.07.0\bin\gswin64c.exe" GhostscriptAlreadyInstalled
  IfFileExists "$PROGRAMFILES\gs\gs10.07.0\bin\gswin64c.exe" GhostscriptAlreadyInstalled
  IfFileExists "$PROGRAMFILES64\gs\*\bin\gswin64c.exe" GhostscriptAlreadyInstalled
  IfFileExists "$PROGRAMFILES\gs\*\bin\gswin64c.exe" GhostscriptAlreadyInstalled
  
  ; Ghostscript not found - ask user
  MessageBox MB_YESNO "Ghostscript not detected. Install now for PDF features?" IDYES InstallGhostscript IDNO SkipGhostscript
  
InstallGhostscript:
  DetailPrint "Installing Ghostscript..."
  IfFileExists "$INSTDIR\bundled\gs10070w64.exe" GhostscriptInstallerFound
  MessageBox MB_OK "Ghostscript installer not found. Please install manually from ghostscript.com"
  Goto GhostscriptDone
  
GhostscriptInstallerFound:
  ExecWait '"$INSTDIR\bundled\gs10070w64.exe"'
  IfFileExists "$PROGRAMFILES64\gs\*\bin\gswin64c.exe" GhostscriptInstallSuccess
  IfFileExists "$PROGRAMFILES\gs\*\bin\gswin64c.exe" GhostscriptInstallSuccess
  MessageBox MB_OK "Ghostscript installation failed or was cancelled."
  Goto GhostscriptDone
  
GhostscriptInstallSuccess:
  DetailPrint "Ghostscript installed successfully!"
  MessageBox MB_OK "Ghostscript installed successfully! All PDF features available."
  Goto GhostscriptDone
  
GhostscriptAlreadyInstalled:
  DetailPrint "Ghostscript already installed."
  Goto GhostscriptDone
  
SkipGhostscript:
  DetailPrint "User skipped Ghostscript."
  MessageBox MB_OK "Ghostscript not installed. PDF compression will not be available."
  Goto GhostscriptDone
  
GhostscriptDone:
  DetailPrint "Installation complete."
  System::Call 'kernel32.dll::SendMessageTimeout(i 0xFFFF, i 0x001A, i 0, t "Environment", i 0x0002, i 5000, *i .r0) i.r1'
  MessageBox MB_OK "Installation Complete! TOOLS 33 is ready to use."
  
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Preparing uninstallation..."
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DetailPrint "Cleaning up..."
  DetailPrint "Note: Ghostscript (if installed) was not removed."
  DetailPrint "Uninstallation complete."
!macroend

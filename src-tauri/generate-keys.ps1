# Generate RSA keys for Tauri updater
Add-Type -AssemblyName System.Security

$rsa = [System.Security.Cryptography.RSA]::Create(2048)

# Export keys using XML format, then convert
$privateXml = $rsa.ToXmlString($true)
$publicXml = $rsa.ToXmlString($false)

# Convert to base64 for Tauri format
$privateBytes = [System.Text.Encoding]::ASCII.GetBytes($privateXml)
$publicBytes = [System.Text.Encoding]::ASCII.GetBytes($publicXml)

$privateKeyBase64 = [Convert]::ToBase64String($privateBytes)
$publicKeyBase64 = [Convert]::ToBase64String($publicBytes)

# Save to files
$privateKeyBase64 | Out-File -FilePath "private.pem" -Encoding ASCII
$publicKeyBase64 | Out-File -FilePath "public.pem" -Encoding ASCII

# Output for copying
Write-Output "Keys generated successfully!"
Write-Output ""
Write-Output "=== PUBLIC KEY (paste this in tauri.conf.json) ==="
Write-Output $publicKeyBase64
Write-Output ""
Write-Output "=== PRIVATE KEY (save this somewhere safe, NEVER share it) ==="
Write-Output "Do NOT share this key! Store it securely."
Write-Output $privateKeyBase64

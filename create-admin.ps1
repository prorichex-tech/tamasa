$ErrorActionPreference = "Stop"
$username = Read-Host "Admin login"
$secure = Read-Host "Admin password (12+ characters)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $json = @{ username = $username; password = $password } | ConvertTo-Json -Compress
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText("$PWD\admin-payload.tmp", $json, $utf8)
  cmd /c "php create-admin.php < admin-payload.tmp"
  if ($LASTEXITCODE -ne 0) { throw "Admin creation failed" }
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item "$PWD\admin-payload.tmp" -ErrorAction SilentlyContinue
  Remove-Variable password -ErrorAction SilentlyContinue
}

$tsxFiles = Get-ChildItem -Recurse -Filter '*.tsx' -Path 'D:\M2 STAGE\PayeSmart\frontend\src'
foreach ($file in $tsxFiles) {
  $content = Get-Content $file.FullName -Raw
  $content = $content -replace "t\('common\.", "t('"
  Set-Content $file.FullName $content
}
Write-Host 'Removed common. prefix from t() calls'

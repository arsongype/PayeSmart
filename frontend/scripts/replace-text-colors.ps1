$files = Get-ChildItem -Recurse -Filter '*.tsx' -Path 'D:\M2 STAGE\PayeSmart\frontend\src'
foreach ($file in $files) {
  $content = Get-Content $file.FullName -Raw
  $content = $content -replace 'text-primary-100', 'text-black'
  $content = $content -replace 'text-primary-200', 'text-black'
  $content = $content -replace 'text-primary-500', 'text-black'
  $content = $content -replace 'text-primary-600', 'text-black'
  $content = $content -replace 'text-primary-700', 'text-black'
  $content = $content -replace 'text-primary-800', 'text-black'
  $content = $content -replace 'text-amber-200', 'text-black'
  $content = $content -replace 'text-amber-500', 'text-black'
  $content = $content -replace 'text-emerald-500', 'text-black'
  $content = $content -replace 'text-emerald-400', 'text-black'
  $content = $content -replace 'text-rose-500', 'text-black'
  $content = $content -replace 'text-rose-400', 'text-black'
  $content = $content -replace 'text-red-500', 'text-black'
  $content = $content -replace 'text-red-400', 'text-black'
  $content = $content -replace 'text-orange-500', 'text-black'
  $content = $content -replace 'text-yellow-500', 'text-black'
  $content = $content -replace 'text-sky-500', 'text-black'
  $content = $content -replace 'text-blue-500', 'text-black'
  Set-Content $file.FullName $content
}

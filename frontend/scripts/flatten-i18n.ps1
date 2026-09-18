param(
  [string]$i18nPath = 'D:\M2 STAGE\PayeSmart\frontend\src\utils\i18n.ts',
  [string]$srcPath = 'D:\M2 STAGE\PayeSmart\frontend\src'
)

$content = Get-Content $i18nPath -Raw

# Flatten translations object: remove nested `common: { ... }` wrapper in fr/en blocks
# Strategy: replace `common: {\n        ... }` patterns with inner content
# We'll do targeted replacements for the known structure

# Remove `common:` keys in translation objects
$content = $content -replace "common:\s*\{", ""

# Remove closing `}` of common blocks - this is tricky, we'll do line-based processing

$lines = $content -split "`n"
$newLines = @()
$skipUntilClosingBrace = $false
$commonDepth = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  
  if ($skipUntilClosingBrace) {
    if ($line -match "^\s*\}\s*$") {
      $skipUntilClosingBrace = $false
    }
    continue
  }
  
  # Detect start of common block
  if ($line -match "^\s*common:\s*\{") {
    $skipUntilClosingBrace = $true
    continue
  }
  
  $newLines += $line
}

$newContent = $newLines -join "`n"

# Remove duplicate closing braces that were after common blocks
# Also fix interface: remove `common: { ... }` wrapper
$newContent = $newContent -replace 'interface Translations \{[\s\S]*?common:\s*\{', 'interface Translations {'
$newContent = $newContent -replace '\}\s*\}', '}'

# Fix translations object structure: flatten fr/en objects
# Replace patterns like:
#   fr: {
#     ...keys...
#   },
# with:
#   fr: {
#     ...keys...
#   },

# Remove extra indentation from flattened keys
$newContent = $newContent -replace '^\s{8}([a-zA-Z][a-zA-Z0-9]*):', '    $1:'

Set-Content $i18nPath $newContent

# Replace t('common. with t(' in all tsx files
$tsxFiles = Get-ChildItem -Recurse -Filter '*.tsx' -Path $srcPath
foreach ($file in $tsxFiles) {
  $fileContent = Get-Content $file.FullName -Raw
  $fileContent = $fileContent -replace "t\('common\.", "t('"
  Set-Content $file.FullName $fileContent
}

Write-Host "Done. Flattened i18n.ts and removed 'common.' prefix from all t() calls."

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$downloadDir = 'C:\Users\SSAFY\Downloads'
$source = (Get-ChildItem -LiteralPath $downloadDir -Filter '*.png' | Where-Object Length -eq 2135142 | Select-Object -First 1).FullName
$resultSources = @{
  'result-1.png' = (Join-Path $downloadDir '574f2164-64ae-4ba0-9e34-cf05fc1d6833.png')
  'result-2.png' = (Join-Path $downloadDir 'b1fd872a-133c-4dd2-a7e1-3fdffc354216.png')
  'result-3.png' = (Join-Path $downloadDir 'eb5dd1ad-7ed1-4872-b3af-6e13abb10343.png')
  'result-4.png' = (Join-Path $downloadDir '2b5819eb-cc34-4e4c-9362-68558a897126.png')
  'pepper-lid.png' = (Get-ChildItem -LiteralPath $downloadDir -Filter '*.png' | Where-Object Length -eq 728446 | Select-Object -First 1).FullName
}
$output = Join-Path $PSScriptRoot '..\public\assets\pepper'
New-Item -ItemType Directory -Force -Path $output | Out-Null

function Save-Crop([string]$sourcePath, [string]$targetPath, [int]$x, [int]$y, [int]$width, [int]$height) {
  $input = [System.Drawing.Image]::FromFile($sourcePath)
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($input, (New-Object System.Drawing.Rectangle(0, 0, $width, $height)), (New-Object System.Drawing.Rectangle($x, $y, $width, $height)), [System.Drawing.GraphicsUnit]::Pixel)
  $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $bitmap.Dispose(); $input.Dispose()
}

$crops = @(
  @{ Name = 'tree.png'; X = 0; Y = 0; W = 320; H = 540 },
  @{ Name = 'fruit-cluster.png'; X = 300; Y = 35; W = 255; H = 390 },
  @{ Name = 'dryer-closed.png'; X = 555; Y = 40; W = 340; H = 390 },
  @{ Name = 'dryer-open.png'; X = 900; Y = 35; W = 380; H = 415 },
  @{ Name = 'black-pepper.png'; X = 1285; Y = 200; W = 250; H = 255 },
  @{ Name = 'twigs.png'; X = 500; Y = 445; W = 300; H = 165 },
  @{ Name = 'dust.png'; X = 835; Y = 450; W = 215; H = 220 },
  @{ Name = 'grinder.png'; X = 0; Y = 545; W = 415; H = 479 },
  @{ Name = 'pepper-mill.png'; X = 505; Y = 610; W = 285; H = 414 },
  @{ Name = 'soup-hands.png'; X = 900; Y = 530; W = 636; H = 494 }
)
foreach ($crop in $crops) {
  Save-Crop $source (Join-Path $output $crop.Name) $crop.X $crop.Y $crop.W $crop.H
}
foreach ($entry in $resultSources.GetEnumerator()) {
  Copy-Item -LiteralPath $entry.Value -Destination (Join-Path $output $entry.Key) -Force
}
Write-Output "Created $($crops.Count) cropped assets and $($resultSources.Count) supplied assets in $output"

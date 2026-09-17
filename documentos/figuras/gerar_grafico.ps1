# Gera as figuras de vazão e volume usadas no guia.
# Não depende de Python. Execute: powershell -File gerar_grafico.ps1

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$outDir = $PSScriptRoot
$width = 1400
$height = 620
$padL = 90
$padR = 90
$padT = 50
$padB = 70
$plotW = $width - $padL - $padR
$plotH = $height - $padT - $padB

$n = 240
$t = 0..($n - 1) | ForEach-Object { $_ * 0.5 }
$flow = foreach ($x in $t) {
  $base = 0
  if ($x -ge 8 -and $x -lt 95) {
    $ramp = [Math]::Min(1, ($x - 8) / 6)
    $base = 42 * $ramp + 6 * [Math]::Sin($x / 7.0)
    if ($x -gt 70) { $base *= [Math]::Max(0.15, 1 - ($x - 70) / 28) }
  }
  [Math]::Max(0, $base)
}
$volume = 0.0
$volumes = foreach ($q in $flow) {
  $volume += $q * (0.5 / 60.0)
  $volume
}

$flowMax = 60
$volMax = [Math]::Max(20, [Math]::Ceiling(($volumes[-1] * 1.15) / 5) * 5)

function MapX([double]$sec) {
  return $padL + ($sec / $t[-1]) * $plotW
}
function MapFlow([double]$q) {
  return $padT + $plotH - ($q / $flowMax) * $plotH
}
function MapVol([double]$v) {
  return $padT + $plotH - ($v / $volMax) * $plotH
}

$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(255, 248, 250, 253))

$fontTitle = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Bold)
$fontAxis = New-Object System.Drawing.Font "Segoe UI", 11
$fontTick = New-Object System.Drawing.Font "Consolas", 10
$navy = [System.Drawing.Color]::FromArgb(255, 29, 79, 145)
$wine = [System.Drawing.Color]::FromArgb(255, 155, 27, 48)
$grid = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(40, 30, 50, 80), 1)
$axis = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 40, 55, 80), 1.5)
$penFlow = [System.Drawing.Pen]::new($navy, 3.2)
$penVol = [System.Drawing.Pen]::new($wine, 3.2)
$penVol.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$brushFlow = New-Object System.Drawing.SolidBrush $navy
$brushVol = New-Object System.Drawing.SolidBrush $wine
$brushText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 40, 55, 80))
$brushMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 110, 125, 145))
$white = [System.Drawing.Brushes]::White

$g.FillRectangle($white, $padL, $padT, $plotW, $plotH)
for ($i = 0; $i -le 5; $i++) {
  $y = $padT + $plotH * $i / 5
  $g.DrawLine($grid, $padL, $y, $padL + $plotW, $y)
  $flowTick = $flowMax * (1 - $i / 5)
  $volTick = $volMax * (1 - $i / 5)
  $g.DrawString(("{0:0}" -f $flowTick), $fontTick, $brushMuted, 18, $y - 8)
  $g.DrawString(("{0:0}" -f $volTick), $fontTick, $brushMuted, $padL + $plotW + 10, $y - 8)
}
for ($i = 0; $i -le 4; $i++) {
  $sec = $t[-1] * $i / 4
  $x = MapX $sec
  $g.DrawLine($grid, $x, $padT, $x, $padT + $plotH)
  $g.DrawString(("{0:0} s" -f $sec), $fontTick, $brushMuted, $x - 18, $padT + $plotH + 10)
}

$flowPts = for ($i = 0; $i -lt $n; $i++) {
  New-Object System.Drawing.PointF ((MapX $t[$i]), (MapFlow $flow[$i]))
}
$volPts = for ($i = 0; $i -lt $n; $i++) {
  New-Object System.Drawing.PointF ((MapX $t[$i]), (MapVol $volumes[$i]))
}
$g.DrawLines($penFlow, [System.Drawing.PointF[]]$flowPts)
$g.DrawLines($penVol, [System.Drawing.PointF[]]$volPts)
$g.DrawRectangle($axis, $padL, $padT, $plotW, $plotH)

# Strings com acento via Unicode, para o .ps1 funcionar em qualquer code page.
$ao = [string][char]0x00E3
$title = "Vaz${ao}o estimada e volume acumulado"
$legendFlow = "Vaz${ao}o"
$g.DrawString($title, $fontTitle, $brushText, $padL, 12)
$g.DrawString("mL/min", $fontAxis, $brushFlow, 16, 18)
$g.DrawString("mL", $fontAxis, $brushVol, $width - 55, 18)
$g.FillRectangle($brushFlow, $padL, $height - 28, 22, 6)
$g.DrawString($legendFlow, $fontAxis, $brushText, $padL + 28, $height - 36)
$g.DrawLine($penVol, $padL + 120, $height - 25, $padL + 142, $height - 25)
$g.DrawString("Volume acumulado", $fontAxis, $brushText, $padL + 148, $height - 36)

$path = Join-Path $outDir "grafico_vazao_volume.png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output $path

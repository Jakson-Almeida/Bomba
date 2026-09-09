param(
  [Parameter(Mandatory = $true)][string]$PortName,
  [int]$Baud = 115200
)

$ErrorActionPreference = "Stop"
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

function New-BoardPort {
  $p = New-Object System.IO.Ports.SerialPort
  $p.PortName = $PortName
  $p.BaudRate = $Baud
  $p.Parity = [System.IO.Ports.Parity]::None
  $p.DataBits = 8
  $p.StopBits = [System.IO.Ports.StopBits]::One
  $p.Handshake = [System.IO.Ports.Handshake]::None
  # ESP32-S3 USB-CDC cai se DTR/RTS resetarem a placa.
  $p.DtrEnable = $false
  $p.RtsEnable = $false
  $p.ReadTimeout = 40
  $p.WriteTimeout = 2000
  $p.NewLine = "`n"
  $p.Open()
  return $p
}

function Try-Reopen([ref]$portRef) {
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 300
    try {
      if ($portRef.Value -and $portRef.Value.IsOpen) {
        $portRef.Value.Close()
      }
    } catch {}
    try {
      $portRef.Value = New-BoardPort
      return $true
    } catch {
      continue
    }
  }
  return $false
}

try {
  $port = New-BoardPort
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}

Start-Sleep -Milliseconds 250

[Console]::Out.WriteLine("__READY__")
[Console]::Out.Flush()

$stdInStream = [Console]::OpenStandardInput()
$asyncRead = $null
$byteBuf = New-Object byte[] 1
$cmdBuf = New-Object System.Text.StringBuilder
$lineBuf = New-Object System.Text.StringBuilder

function Flush-SerialLines {
  $text = $lineBuf.ToString()
  $nl = $text.IndexOf([char]10)
  while ($nl -ge 0) {
    $line = $text.Substring(0, $nl).TrimEnd([char]13)
    if ($line.Length -gt 0) {
      [Console]::Out.WriteLine($line)
      [Console]::Out.Flush()
    }
    $text = $text.Substring($nl + 1)
    $nl = $text.IndexOf([char]10)
  }
  $lineBuf.Clear() | Out-Null
  [void]$lineBuf.Append($text)
}

try {
  while ($true) {
    if (-not $port -or -not $port.IsOpen) {
      if (-not (Try-Reopen([ref]$port))) {
        break
      }
    }

    if ($null -eq $asyncRead) {
      try {
        $asyncRead = $stdInStream.BeginRead($byteBuf, 0, 1, $null, $null)
      } catch {
        $asyncRead = $null
      }
    }
    if ($asyncRead -and $asyncRead.IsCompleted) {
      try {
        $n = $stdInStream.EndRead($asyncRead)
      } catch {
        $n = -1
      }
      $asyncRead = $null
      if ($n -gt 0) {
        $ch = [char]$byteBuf[0]
        if ($ch -eq [char]10) {
          $cmd = $cmdBuf.ToString().TrimEnd([char]13)
          $cmdBuf.Clear() | Out-Null
          if ($cmd -eq "__CLOSE__") {
            break
          }
          if ($cmd.Length -gt 0 -and $port.IsOpen) {
            try { $port.Write($cmd + "`n") } catch {}
          }
        } else {
          [void]$cmdBuf.Append($ch)
        }
      }
    }

    try {
      $chunk = $port.ReadExisting()
      if ($chunk.Length -gt 0) {
        [void]$lineBuf.Append($chunk)
        Flush-SerialLines
      }
    } catch [System.TimeoutException] {
    } catch {
      if (-not (Try-Reopen([ref]$port))) {
        break
      }
    }

    Start-Sleep -Milliseconds 10
  }
} finally {
  try { if ($port -and $port.IsOpen) { $port.Close() } } catch {}
}

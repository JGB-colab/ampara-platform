#Requires -Version 5.1
<#
  Ampara - assistente de coleta OBD no PC (passo a passo guiado pela maquina).
  Prepara o ambiente, encontra o dongle ELM327, testa as credenciais na nuvem
  e inicia o coletor apontando para a API na nuvem (sem localhost).

  Uso:
      .\scripts\iniciar-coleta.ps1
#>

# Falhas de comandos nativos sao tratadas por exit codes (verificar $LASTEXITCODE).
$ErrorActionPreference = 'Continue'

function Step($m) { Write-Host ''; Write-Host ">> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "   OK   $m" -ForegroundColor Green }
function Err($m)  { Write-Host "   ERRO $m" -ForegroundColor Red }
function Info($m) { Write-Host "   $m" -ForegroundColor Gray }

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host '==============================================' -ForegroundColor Yellow
Write-Host ' Ampara - assistente de coleta (PC + nuvem)' -ForegroundColor Yellow
Write-Host '==============================================' -ForegroundColor Yellow

# ------------------------------------------------- 0/6 Coleta em andamento?
Step '0/6 Verificando se ja existe coleta em andamento...'
$running = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match 'coletor\.py' })
if ($running.Count -gt 0) {
    foreach ($p in $running) {
        $exe = if ($p.CommandLine -match '^\s*"?([^"]+python\.exe)"?') { $Matches[1] } else { 'python' }
        Info "   PID $($p.ProcessId) - $exe"
    }
    $answer = Read-Host 'Ja existe uma coleta em andamento. Encerrar antes de continuar? (s/n)'
    if ($answer -match '^[sS]') {
        foreach ($p in $running) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 2
        Ok 'Coletas anteriores encerradas.'
    } else {
        Err 'Ja existe uma coleta em andamento; nao vou iniciar outra em cima.'
        Info 'Feche a janela da coleta (Ctrl+C) e rode este script de novo.'
        exit 1
    }
} else {
    Ok 'Nenhuma coleta em andamento.'
}

# ---------------------------------------------------------------- 1/6 Python
Step '1/6 Verificando Python...'
$py = $null
if (Get-Command py -ErrorAction SilentlyContinue) { $py = 'py' }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $py = 'python' }
if (-not $py) {
    Err 'Python nao encontrado.'
    Info 'Instale em https://www.python.org/downloads/ marcando "Add Python to PATH" e rode o script de novo.'
    exit 1
}
Ok "Python encontrado ($py)"

$venvPy = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path $venvPy)) {
    Info 'Criando ambiente virtual (.venv)...'
    & $py -m venv .venv
    if (-not (Test-Path $venvPy)) { Err 'Falha ao criar .venv'; exit 1 }
}
Ok 'Ambiente virtual pronto (.venv)'

& $venvPy -c 'import obd' 2>$null
if ($LASTEXITCODE -ne 0) {
    Info 'Instalando a biblioteca obd (python-OBD)...'
    & $venvPy -m pip install --quiet obd
    & $venvPy -c 'import obd' 2>$null
    if ($LASTEXITCODE -ne 0) { Err 'Nao foi possivel instalar "obd". Verifique a internet e rode de novo.'; exit 1 }
}
Ok 'Biblioteca obd instalada'

# -------------------------------------------------------- 2/6 Servico nuvem
Step '2/6 Servico na nuvem (API + banco + dashboard)'
$defaultUrl = 'https://ampara-platform.onrender.com'
$urlInput = Read-Host "URL da API [Enter = $defaultUrl]"
$baseUrl = $defaultUrl
if ($urlInput -and $urlInput.Trim()) { $baseUrl = $urlInput.Trim().TrimEnd('/') }
Info "Usando: $baseUrl"
Info 'Verificando o servico (pode levar ate 60s se estiver dormindo)...'
$deadline = (Get-Date).AddSeconds(120)
$healthy = $false
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 20
        if ([int]$r.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 10
}
if (-not $healthy) {
    Err "O servico nao respondeu em $baseUrl/health."
    Info 'Confira a URL e se o servico do Render esta ativo (plano free dorme sem trafego).'
    exit 1
}
Ok "Servico no ar ($baseUrl/health = ok)"

# ------------------------------------------------------- 3/6 Credenciais
Step '3/6 Credenciais do dispositivo'
Write-Host '   (o mesmo AMAPARA_DEVICE_TOKEN configurado no Render, sem espacos)' -ForegroundColor Gray
$secure = Read-Host 'Token do dispositivo' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
if (-not $token) { Err 'Token vazio. Cole o token do Render.'; exit 1 }
$vehicle = Read-Host 'Veiculo - ex.: classic-demo ou o VIN do seu carro [Enter = classic-demo]'
if (-not $vehicle -or -not $vehicle.Trim()) { $vehicle = 'classic-demo' } else { $vehicle = $vehicle.Trim() }
Ok "Veiculo: $vehicle"

# ------------------------------------------- 4/6 Teste de credenciais
Step '4/6 Testando credenciais na nuvem (leitura de teste)...'
$body = @{
    event_id    = [guid]::NewGuid().ToString()
    vehicle_id  = $vehicle
    recorded_at = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    pid         = '010C'
    value       = 850
    unit        = 'rpm'
} | ConvertTo-Json

$code = 0
$detail = ''
for ($i = 1; $i -le 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$baseUrl/v1/telemetria" -Method Post `
            -Headers @{ 'X-Device-Token' = $token } `
            -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 30
        $code = [int]$r.StatusCode
        $detail = ''
    } catch {
        $resp = $_.Exception.Response
        if ($null -ne $resp -and $null -ne $resp.StatusCode) {
            $code = [int]$resp.StatusCode
            try {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
                $txt = $sr.ReadToEnd()
                $sr.Close()
                $j = $txt | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($null -ne $j -and $j.detail) { $detail = [string]$j.detail }
            } catch { }
        } else {
            $code = 0
            $detail = $_.Exception.Message
        }
    }
    if ($code -eq 503 -or $code -eq 0) {
        Info "servico/banco acordando... tentativa $i de 12"
        Start-Sleep -Seconds 10
        continue
    }
    break
}

switch ($code) {
    201 { Ok 'Credenciais validas (leitura de teste registrada).' }
    200 { Ok 'Credenciais validas.' }
    409 { Ok 'Credenciais validas.' }
    401 {
        Err "Token INVALIDO. Resposta: $detail"
        Info 'Copie o AMAPARA_DEVICE_TOKEN exato do Render (Environment Variables do servico) e rode de novo.'
        exit 1
    }
    403 {
        Err "Veiculo NAO AUTORIZADO. Resposta: $detail"
        Info 'O servidor so aceita o vehicle_id configurado em AMAPARA_ALLOWED_VEHICLE_ID (ou * para qualquer).'
        exit 1
    }
    422 { Err "Recusado pelo contrato da API: $detail"; exit 1 }
    default { Err "Falha HTTP $code ao testar credenciais. $detail"; exit 1 }
}

# ------------------------------------------------------ 5/6 Dongle / COM
Step '5/6 Procurando o dongle ELM327'
Info 'Certifique-se de que o dongle esta pareado ao PC e a ignicao esta ligada.'
Info 'Testando cada porta COM (livre/ocupada) e validando com leitura real de RPM...'

$probePath = Join-Path $env:TEMP 'ampara_probe_com.py'
$probeSrc = @'
import time

import serial
import serial.tools.list_ports

ports = sorted({p.device for p in serial.tools.list_ports.comports()})
print("PORTS:" + ",".join(ports))


def atz_check(dev):
    for baud in (38400, 9600, 57600, 115200):
        try:
            s = serial.Serial(dev, baud, timeout=0.5, write_timeout=1.5)
        except Exception as exc:
            if "PermissionError" in str(exc) or "Permission denied" in str(exc):
                print("BUSY:%s" % dev)
                return None
            continue
        try:
            s.reset_input_buffer()
            s.write(b"ATZ\r")
            s.flush()
            time.sleep(1.0)
            raw = s.read(300)
        except Exception:
            raw = b""
        finally:
            try:
                s.close()
            except Exception:
                pass
        text = raw.decode("ascii", "ignore").replace("\r", " ").replace("\n", " ").strip()
        up = text.upper()
        if "ELM" in up or "OBD" in up or "ATZ" in up:
            print("ATZ:%s:%s" % (dev, text[:60]))
            return True
        time.sleep(0.3)
    return False


candidates = []
for dev in ports:
    print("SCAN:%s" % dev)
    if atz_check(dev):
        candidates.append(dev)

if not candidates:
    print("NONE")

try:
    import obd
except Exception:
    obd = None

for dev in candidates:
    value = None
    error = ""
    if obd is None:
        error = "biblioteca obd indisponivel"
    for _attempt in (1, 2):
        if value is not None or obd is None:
            break
        time.sleep(2.0)
        try:
            connection = obd.OBD(portstr=dev)
            connected = connection.is_connected()
            response = None
            if connected:
                response = connection.query(obd.commands.RPM)
            connection.close()
            if not connected:
                error = "ELM nao manteve a conexao (porta disputada?)"
                continue
            if not response.is_null():
                value = float(response.value)
                break
            error = "porta responde, mas o carro nao (ignicao ligada?)"
            break
        except Exception as exc:
            error = str(exc)[:60]
    if value is not None:
        print("DATA:%s:%g" % (dev, value))
        break
    print("NODATA:%s:%s" % (dev, error))
'@
Set-Content -Path $probePath -Value $probeSrc -Encoding ASCII

$probeOut = (& $venvPy -u $probePath 2>&1 | Out-String)
$comPort = $null
$portList = @()
$busyPorts = @()
$atzPorts = @()
$noDataPorts = @()
foreach ($line in ($probeOut -split "`r?`n")) {
    if ($line -like 'PORTS:*') { $portList = ($line.Substring(6) -split ',') | Where-Object { $_ } }
    elseif ($line -like 'SCAN:*') { Info ("   testando " + $line.Substring(5)) }
    elseif ($line -like 'BUSY:*') { $busyPorts += $line.Substring(5).Trim() }
    elseif ($line -like 'ATZ:*') { $atzPorts += ($line.Substring(4) -split ':')[0].Trim() }
    elseif ($line -like 'DATA:*') {
        $parts = ($line.Substring(5)) -split ':', 2
        $dataPort = $parts[0].Trim()
        if (-not $comPort) {
            $comPort = $dataPort
            $rpm = ''
            if ($parts.Count -gt 1) { $rpm = ' (RPM ' + $parts[1].Trim() + ')' }
            Ok "Dongle com dado real em $dataPort$rpm"
        }
    }
    elseif ($line -like 'NODATA:*') { $noDataPorts += ($line.Substring(7) -split ':')[0].Trim() }
}

if ($comPort) {
    foreach ($b in $busyPorts) { Info "   $b ocupada por outro processo (ignorada)" }
    foreach ($p in $atzPorts) {
        if ($p -ne $comPort) { Info "   $p responde ao ATZ mas sem dado do carro (ignorada)" }
    }
} else {
    if ($busyPorts.Count -gt 0) { Info ('   Ocupadas (outro processo): ' + ($busyPorts -join ', ')) }
    if ($atzPorts.Count -gt 0) {
        Info ('   ATZ ok, mas nenhum RPM lido: ' + ($atzPorts -join ', '))
        Info '   -> verifique se a ignicao esta ligada (posicao 2) e rode de novo.'
    }
    if ($portList.Count -gt 0) { Info ('Portas detectadas: ' + ($portList -join ', ')) }
    else { Info 'Nenhuma porta COM detectada.' }
    Info 'Dica: pareie o dongle em Configuracoes > Bluetooth do Windows e ligue a ignicao.'
    $comPort = Read-Host 'Digite a porta do dongle (ex.: COM5) ou deixe vazio para cancelar'
    if (-not $comPort -or -not $comPort.Trim()) { exit 1 }
    $comPort = $comPort.Trim().ToUpper()
}

# ------------------------------------------------------- 6/6 Iniciar coleta
$interval = Read-Host 'Intervalo entre leituras em segundos [Enter = 5]'
if (-not $interval -or -not $interval.Trim()) { $interval = '5' }

$env:AMAPARA_BASE_URL = $baseUrl
$env:AMAPARA_DEVICE_TOKEN = $token
$env:AMAPARA_ALLOWED_VEHICLE_ID = $vehicle

Step '6/6 Iniciando coleta em tempo real'
Write-Host ''
Write-Host "   >>> Abra no navegador: $baseUrl/" -ForegroundColor Yellow
Write-Host '   >>> Conecte no dashboard com o MESMO token e o MESMO veiculo.' -ForegroundColor Yellow
Write-Host '   >>> Para parar a coleta, pressione Ctrl+C.' -ForegroundColor Gray
Write-Host ''
Info 'Aguardando 3s para a porta Bluetooth liberar a sessao do teste anterior...'
Start-Sleep -Seconds 3

& $venvPy (Join-Path $projectRoot 'scripts\coletor.py') --real $comPort --interval $interval

Write-Host ''
Info 'Coleta encerrada.'
Info 'Se apareceu 401 -> token errado; 403 -> veiculo nao autorizado; 503 -> servico dormindo (aguarde 60s).'

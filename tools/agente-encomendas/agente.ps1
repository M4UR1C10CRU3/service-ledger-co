# Clariza - Encomendas da loja: agente do PC da loja (Tudo Casa - Warm)
# 1) Cria no servidor a pasta de cada encomenda paga e guarda la a folha de encomenda.
# 2) Procura nas pastas PDFs novos (fatura-recibo, comprovativo...) e anexa-os ao cartao do Clariza.
# Corre pela tarefa agendada criada por instalar.ps1. Configuracao em config.json (mesma pasta).
# Ficheiro so com ASCII de proposito: o PowerShell 5.1 le mal acentos em scripts sem BOM.

$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $aqui 'agente.log'

function Escrever($msg) {
  $linha = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
  Add-Content -Path $log -Value $linha -Encoding UTF8
  if ((Get-Item $log).Length -gt 2MB) { Move-Item $log ($log + '.antigo') -Force }
}

try {
  $cfg = Get-Content (Join-Path $aqui 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
} catch { Escrever "ERRO: config.json em falta ou invalido ($($_.Exception.Message))"; exit 1 }

if (-not $cfg.token -or $cfg.token -like '*COLAR*') { Escrever 'ERRO: falta o token em config.json'; exit 1 }
if (-not (Test-Path -LiteralPath $cfg.pasta_base)) { Escrever "ERRO: sem acesso a pasta base $($cfg.pasta_base)"; exit 1 }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$cab = @{ 'x-agente-token' = $cfg.token }

function Api-Get($acao, $extra = '') {
  $r = Invoke-WebRequest -UseBasicParsing -Uri ($cfg.url + '?acao=' + $acao + $extra) -Headers $cab -Method Get
  $txt = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  return ($txt | ConvertFrom-Json)
}
function Api-Post($corpo) {
  $json = $corpo | ConvertTo-Json -Depth 5 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $r = Invoke-WebRequest -UseBasicParsing -Uri $cfg.url -Headers $cab -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes
  return ([Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json)
}

# ---- 1. Pastas das encomendas novas ----
try {
  $pend = Api-Get 'pendentes'
  foreach ($e in $pend.encomendas) {
    $pasta = Join-Path $cfg.pasta_base $e.pasta_relativa
    if (-not (Test-Path -LiteralPath $pasta)) { New-Item -ItemType Directory -Path $pasta -Force | Out-Null }
    if ($e.folha_url) {
      $destino = Join-Path $pasta ('Folha de encomenda #' + $e.numero + '.pdf')
      if (-not (Test-Path -LiteralPath $destino)) { Invoke-WebRequest -UseBasicParsing -Uri $e.folha_url -OutFile $destino }
    }
    Api-Post @{ acao = 'pasta-criada'; numero = $e.numero } | Out-Null
    Escrever "Pasta criada: $($e.pasta_relativa)"
  }
} catch { Escrever "ERRO a criar pastas: $($_.Exception.Message)" }

# ---- 2. PDFs novos nas pastas -> cartao ----
try {
  $lista = Api-Get 'pastas' ('&dias=' + [int]$cfg.dias_a_verificar)
  foreach ($e in $lista.encomendas) {
    $pasta = Join-Path $cfg.pasta_base $e.pasta_relativa
    if (-not (Test-Path -LiteralPath $pasta)) { continue }
    $ja = @($e.anexos_enviados)
    Get-ChildItem -LiteralPath $pasta -Filter '*.pdf' -File | Where-Object {
      $_.Name -notlike 'Folha de encomenda*' -and $ja -notcontains $_.Name -and $_.Length -lt 15MB
    } | ForEach-Object {
      try {
        $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName))
        $r = Api-Post @{ acao = 'anexo'; numero = $e.numero; nome = $_.Name; base64 = $b64 }
        if ($r.ok) { Escrever "Anexado ao cartao #$($e.numero): $($_.Name)" }
      } catch { Escrever "ERRO a anexar $($_.Name) (#$($e.numero)): $($_.Exception.Message)" }
    }
  }
} catch { Escrever "ERRO a verificar pastas: $($_.Exception.Message)" }

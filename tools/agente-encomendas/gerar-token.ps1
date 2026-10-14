# Gera um token novo para o agente, grava-o no config.json e mostra-o UMA vez para colar no Supabase
# (Edge Functions > Secrets > ECOMMERCE_AGENTE_TOKEN). Clique direito > Executar com o PowerShell.
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfgFich = Join-Path $aqui 'config.json'
try {
  if (-not (Test-Path $cfgFich)) { Copy-Item (Join-Path $aqui 'config.exemplo.json') $cfgFich }
  $b = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  $t = -join ($b | ForEach-Object { $_.ToString('x2') })
  $c = Get-Content $cfgFich -Raw -Encoding UTF8 | ConvertFrom-Json
  $c.token = $t
  $json = $c | ConvertTo-Json
  [IO.File]::WriteAllText($cfgFich, $json, (New-Object Text.UTF8Encoding $false))
  $sha = New-Object Security.Cryptography.SHA256Managed
  $h = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($t)) | ForEach-Object { $_.ToString('x2') })
  Write-Host ''
  Write-Host 'Token gravado no config.json.' -ForegroundColor Green
  Write-Host 'COPIE PARA O SUPABASE (ECOMMERCE_AGENTE_TOKEN):' -ForegroundColor Yellow
  Write-Host $t
  Write-Host ("Impressao digital (o DIGERIR do Supabase deve comecar assim): " + $h.Substring(0, 12)) -ForegroundColor Cyan
} catch {
  Write-Host ('ERRO: ' + $_.Exception.Message) -ForegroundColor Red
}
Write-Host ''
Read-Host 'Depois de colar no Supabase, carregue Enter para fechar (o token desaparece do ecra)'

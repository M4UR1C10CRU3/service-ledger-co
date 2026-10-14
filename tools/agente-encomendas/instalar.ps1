# Instala a tarefa agendada «Clariza - Encomendas da loja» no PC da loja.
# Correr UMA vez, com o utilizador que tem acesso a \\APPS01 (clique direito > Executar com o PowerShell).
# A tarefa corre a cada 30 minutos enquanto esse utilizador tiver sessao iniciada.
$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $aqui 'agente.ps1'
$nome = 'Clariza - Encomendas da loja'

if (-not (Test-Path (Join-Path $aqui 'config.json'))) {
  Copy-Item (Join-Path $aqui 'config.exemplo.json') (Join-Path $aqui 'config.json')
  Write-Host 'Criei config.json. Abra-o, cole o token e volte a correr este instalador.' -ForegroundColor Yellow
  notepad (Join-Path $aqui 'config.json')
  exit
}

$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$gatilho = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30)
$def = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew
$quem = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

if (Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $nome -Confirm:$false }
Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Settings $def -Principal $quem -Description 'Cria as pastas das encomendas pagas no APPS01 e leva faturas-recibo e comprovativos para os cartoes do Clariza.' | Out-Null

Write-Host "Tarefa '$nome' instalada. Primeira execucao dentro de 1 minuto." -ForegroundColor Green
Write-Host "Registo de atividade: $(Join-Path $aqui 'agente.log')"
Write-Host 'A correr agora uma vez para testar...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script
Get-Content (Join-Path $aqui 'agente.log') -Tail 10 -ErrorAction SilentlyContinue

[CmdletBinding()]
param(
    [string]$TvAddress,

    [string]$DeviceName,

    [ValidateRange(1, 65535)]
    [int]$Port = 9922,

    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$SshUser = 'prisoner'
)

$ErrorActionPreference = 'Stop'
$reportPath = Join-Path $PSScriptRoot 'stage1-tv-connection-report.txt'
$report = [System.Collections.Generic.List[string]]::new()

function Add-ReportLine {
    param([string]$Text = '')
    $report.Add($Text)
    Write-Host $Text
}

function Save-Report {
    $report | Set-Content -LiteralPath $reportPath -Encoding UTF8
}

function Test-TcpPort {
    param([string]$HostName, [int]$TargetPort)
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $async = $client.BeginConnect($HostName, $TargetPort, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(5000)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-DeviceRegistry {
    $registryPath = Join-Path $env:APPDATA '.webos\tv\novacom-devices.json'
    if (-not (Test-Path -LiteralPath $registryPath -PathType Leaf)) {
        return [pscustomobject]@{ Exists = $false; Devices = @() }
    }
    $parsed = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
    return [pscustomobject]@{
        Exists = $true
        Devices = @($parsed | ForEach-Object { $_ })
    }
}

try {
    if (-not $TvAddress) { $TvAddress = Read-Host 'TV IP address' }
    if (-not $DeviceName) { $DeviceName = Read-Host 'Device alias [tv]' }
    if (-not $DeviceName) { $DeviceName = 'tv' }
    if ($DeviceName -notmatch '^[A-Za-z0-9._-]+$') {
        throw 'Device alias may contain only letters, numbers, dot, underscore, and hyphen.'
    }
    $parsedAddress = $null
    if (-not [Net.IPAddress]::TryParse($TvAddress, [ref]$parsedAddress)) {
        throw 'TV address must be a valid IPv4 or IPv6 address.'
    }
    if ([Net.IPAddress]::IsLoopback($parsedAddress)) {
        throw 'A loopback address cannot be used as the TV address.'
    }

    Add-ReportLine 'ZUI_WINDOWS_STAGE1_TV_REPORT_V1'
    Add-ReportLine "generated_at=$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
    Add-ReportLine "device_name=$DeviceName"
    Add-ReportLine "tv_address=$TvAddress"
    Add-ReportLine "ssh_port=$Port"
    Add-ReportLine ''

    $node = Get-Command node.exe -ErrorAction Stop
    $ares = Get-Command ares.cmd -ErrorAction Stop
    $aresSetup = Get-Command ares-setup-device.cmd -ErrorAction Stop
    $aresNovacom = Get-Command ares-novacom.cmd -ErrorAction Stop
    $aresDevice = Get-Command ares-device.cmd -ErrorAction Stop

    $nodeVersion = (& $node.Source --version).Trim()
    $aresVersion = (& $ares.Source -V 2>&1 | Select-Object -First 1).ToString().Trim()
    Add-ReportLine '[TOOL_PRECHECK]'
    Add-ReportLine "node_version=$nodeVersion"
    Add-ReportLine "ares_version=$aresVersion"
    Add-ReportLine 'tool_precheck=PASS'
    Add-ReportLine ''

    Add-ReportLine '[NETWORK]'
    $icmp = Test-Connection -ComputerName $TvAddress -Count 1 -Quiet -ErrorAction SilentlyContinue
    Add-ReportLine "icmp_reachability=$icmp"
    $portOpen = Test-TcpPort -HostName $TvAddress -TargetPort $Port
    Add-ReportLine "ssh_port_reachable=$portOpen"
    if (-not $portOpen) {
        throw "The TV did not accept a TCP connection on port $Port. Check the address, Developer Mode, Key Server, and network isolation."
    }
    Add-ReportLine 'network_and_ssh_port=PASS'
    Add-ReportLine ''

    $registry = Get-DeviceRegistry
    $nameMatches = @($registry.Devices | Where-Object {
        $_.name -eq $DeviceName -and $_.profile -eq 'tv'
    })
    if ($nameMatches.Count -gt 1) {
        throw "More than one persisted TV-profile record named '$DeviceName' exists. No record was changed."
    }

    Add-ReportLine '[CLI_DEVICE_RECORD]'
    Add-ReportLine "registry_present=$($registry.Exists)"
    if ($nameMatches.Count -eq 0) {
        & $aresSetup.Source --add $DeviceName `
            --info "username=$SshUser" `
            --info "host=$TvAddress" `
            --info "port=$Port" `
            --info 'description=ZUI webOS TV' `
            --info 'password='
        if ($LASTEXITCODE -ne 0) {
            throw "The CLI device record '$DeviceName' could not be added."
        }
        $registry = Get-DeviceRegistry
        $nameMatches = @($registry.Devices | Where-Object {
            $_.name -eq $DeviceName -and $_.profile -eq 'tv'
        })
        if ($nameMatches.Count -ne 1) {
            throw 'The CLI reported success, but exactly one persisted device record was not verified.'
        }
        Add-ReportLine 'device_record_action=ADDED'
    } else {
        Add-ReportLine 'device_record_action=REUSED_WITHOUT_OVERWRITE'
    }

    $device = $nameMatches[0]
    $recordMatches = (
        [string]$device.host -eq $TvAddress -and
        [string]$device.port -eq [string]$Port -and
        [string]$device.username -eq $SshUser
    )
    Add-ReportLine "device_record_matches_requested=$recordMatches"
    if (-not $recordMatches) {
        throw "The existing '$DeviceName' record points to different connection details. It was not modified. Choose another device name or correct it manually after review."
    }
    Add-ReportLine 'cli_device_record=PASS'
    Add-ReportLine ''

    $keyReference = if ($device.privateKey -and $device.privateKey.openSsh) {
        [string]$device.privateKey.openSsh
    } else { '' }
    $keyPresent = $false
    if ($keyReference) {
        $keyPresent = Test-Path -LiteralPath (Join-Path (Join-Path $env:USERPROFILE '.ssh') $keyReference) -PathType Leaf
    }

    Add-ReportLine '[SSH_KEY]'
    Add-ReportLine "key_reference_present_before=$([bool]$keyReference)"
    Add-ReportLine "referenced_key_file_present_before=$keyPresent"
    if ($keyPresent) {
        Add-ReportLine 'key_acquisition=NOT_RUN_EXISTING_KEY_REUSED'
    } else {
        Write-Host ''
        Write-Host 'TV Developer Mode uygulamasinda Dev Mode Status ve Key Server ON olmalidir.' -ForegroundColor Yellow
        Write-Host 'Passphrase degerini yalniz CLI istemine girin; rapora veya destek mesajina yazmayin.' -ForegroundColor Yellow
        Read-Host 'Hazir oldugunuzda ENTER tusuna basin'
        & $aresNovacom.Source --device $DeviceName --getkey
        if ($LASTEXITCODE -ne 0) {
            throw 'SSH key acquisition failed. Check Key Server and the case-sensitive passphrase.'
        }
        Add-ReportLine 'key_acquisition=PASS'
    }

    $registryAfter = Get-DeviceRegistry
    $deviceAfter = @($registryAfter.Devices | Where-Object {
        $_.name -eq $DeviceName -and $_.profile -eq 'tv'
    }) | Select-Object -First 1
    $keyReferenceAfter = if ($deviceAfter.privateKey -and $deviceAfter.privateKey.openSsh) {
        [string]$deviceAfter.privateKey.openSsh
    } else { '' }
    $keyPresentAfter = $false
    if ($keyReferenceAfter) {
        $keyPresentAfter = Test-Path -LiteralPath (Join-Path (Join-Path $env:USERPROFILE '.ssh') $keyReferenceAfter) -PathType Leaf
    }
    Add-ReportLine "key_reference_present_after=$([bool]$keyReferenceAfter)"
    Add-ReportLine "referenced_key_file_present_after=$keyPresentAfter"
    if (-not $keyReferenceAfter -or -not $keyPresentAfter) {
        throw 'A usable referenced SSH key file was not verified.'
    }
    Add-ReportLine 'ssh_key_file=PASS'
    Add-ReportLine ''

    Add-ReportLine '[AUTHENTICATION]'
    $systemInfo = @(& $aresDevice.Source --system-info --device $DeviceName 2>&1)
    $systemInfoCode = $LASTEXITCODE
    foreach ($line in $systemInfo) {
        $safeLine = [string]$line
        if ($safeLine -notmatch '(?i)password|passphrase|private.?key') {
            Add-ReportLine $safeLine
        }
    }
    Add-ReportLine "system_info_exit_code=$systemInfoCode"
    if ($systemInfoCode -ne 0) {
        throw 'SSH authentication or TV system-info query failed.'
    }
    Add-ReportLine 'ssh_authentication=PASS'
    Add-ReportLine 'application_install_permission=NOT_TESTED'
    Add-ReportLine ''

    Add-ReportLine '[PRIVACY_GUARDS]'
    Add-ReportLine 'private_key_content_recorded=False'
    Add-ReportLine 'passphrase_recorded=False'
    Add-ReportLine 'tv_application_installed=False'
    Add-ReportLine 'tv_application_removed=False'
    Add-ReportLine ''
    Add-ReportLine 'stage1_tv_connection=PASS'
    Save-Report
    Write-Host "TAMAM: TV kaydi, SSH key dosyasi ve kimlik dogrulama kontrol edildi. Rapor: $reportPath" -ForegroundColor Green
} catch {
    Add-ReportLine ''
    Add-ReportLine 'stage1_tv_connection=FAIL'
    Add-ReportLine "failure=$($_.Exception.Message)"
    Save-Report
    Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Rapor: $reportPath"
    exit 1
}

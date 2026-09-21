[CmdletBinding()]
param(
    [string]$SourceRef,

    [string]$SourceDirectory,

    [switch]$AllowNodeMsiRemoval
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$gitVersion = '2.55.0.5'
$gitUrl = 'https://github.com/git-for-windows/git/releases/download/v2.55.0.windows.5/Git-2.55.0.5-64-bit.exe'
$gitSha256 = 'D065A4E23C3D9A6B5073D609B5BE0830227EC3CA053C083BA385061DDFAF94C6'
$nvmVersion = '1.2.2'
$nvmUrl = 'https://github.com/coreybutler/nvm-windows/releases/download/1.2.2/nvm-noinstall.zip'
$nvmMd5 = 'D654C26A04E35A318D5939F8CEB09934'
$nvmSha256 = '74232EA51C060ECD44ECF2CEBEE314ED9E3F6DA56E1F9484D8D46C4E8BB6AE0E'
$node16Version = '16.20.2'
$node16Sha256 = 'F8BB35F6C08DC7BF14AC753509C06ED1A7EBF5B390CD3FBDC8F8C1AEDD020EC3'
$node24Version = '24.18.0'
$node24Sha256 = '0AE68406B42D7725661DA979B1403EC9926DA205C6770827F33AAC9D8F26E821'
$cliVersion = '3.2.5'
$cliIntegrity = 'sha512-cKmIJ5WpmQjiwiv1CKcsvRyfT3FhxDt1eb/f5h+Yo1mHWx+qbS9+R4ikY6cF+Yp/ZNELbUD0SZiQCEx6VHQe+g=='
$repositoryUrl = 'https://github.com/Simulate-X/ZUI_IPTV_Player.git'

$workRoot = Join-Path $env:USERPROFILE 'Documents\ZUI-IPTV-Setup'
$downloadRoot = Join-Path $workRoot 'downloads'
$reportPath = Join-Path $PSScriptRoot 'stage2-developer-setup-report.txt'
$logPath = Join-Path $PSScriptRoot 'stage2-developer-setup.log'
$report = [System.Collections.Generic.List[string]]::new()
$transcriptStarted = $false

function Add-ReportLine {
    param([string]$Text = '')
    $report.Add($Text)
    Write-Host $Text
}

function Save-Report {
    $report | Set-Content -LiteralPath $reportPath -Encoding UTF8
}

function Assert-Hash {
    param([string]$Path, [ValidateSet('MD5', 'SHA256')][string]$Algorithm, [string]$Expected)
    $actual = (Get-FileHash -LiteralPath $Path -Algorithm $Algorithm).Hash.ToUpperInvariant()
    if ($actual -ne $Expected.ToUpperInvariant()) {
        throw "$Algorithm verification failed for $(Split-Path -Leaf $Path)."
    }
    return $actual
}

function Get-VerifiedDownload {
    param([string]$Url, [string]$Destination, [string]$Algorithm, [string]$Expected)
    if (-not (Test-Path -LiteralPath $Destination -PathType Leaf)) {
        Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Destination | Out-Null
    }
    Assert-Hash -Path $Destination -Algorithm $Algorithm -Expected $Expected
}

function Get-NodeMsiEntries {
    $roots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    return @(Get-ItemProperty -Path $roots -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'Node.js' })
}

function Install-NodeArchive {
    param([string]$Version, [string]$ExpectedSha256, [string]$NvmHome)
    $versionDir = Join-Path $NvmHome "v$Version"
    if (Test-Path -LiteralPath $versionDir) {
        $nodeExe = Join-Path $versionDir 'node.exe'
        if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf) -or (& $nodeExe --version).Trim() -ne "v$Version") {
            throw "Existing NVM version directory v$Version is incomplete or mismatched."
        }
        return $versionDir
    }

    $archiveName = "node-v$Version-win-x64.zip"
    $archivePath = Join-Path $downloadRoot $archiveName
    Get-VerifiedDownload -Url "https://nodejs.org/dist/v$Version/$archiveName" -Destination $archivePath -Algorithm SHA256 -Expected $ExpectedSha256 | Out-Null
    $extractRoot = Join-Path $workRoot ("extract-node-$Version-" + [guid]::NewGuid().ToString('N'))
    Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot
    $inner = Join-Path $extractRoot "node-v$Version-win-x64"
    if (-not (Test-Path -LiteralPath (Join-Path $inner 'node.exe') -PathType Leaf)) {
        throw "Official Node archive structure could not be verified for v$Version."
    }
    Move-Item -LiteralPath $inner -Destination $versionDir
    if ((& (Join-Path $versionDir 'node.exe') --version).Trim() -ne "v$Version") {
        throw "Installed Node v$Version verification failed."
    }
    return $versionDir
}

try {
    Start-Transcript -LiteralPath $logPath -Force | Out-Null
    $transcriptStarted = $true

    if (-not $SourceRef) { $SourceRef = Read-Host 'Source tag, branch, or commit [main]' }
    if (-not $SourceRef) { $SourceRef = 'main' }
    if ($SourceRef -notmatch '^[A-Za-z0-9._/-]{1,200}$') {
        throw 'Source ref contains unsupported characters.'
    }
    if (-not $SourceDirectory) {
        $safeRef = $SourceRef -replace '[^A-Za-z0-9._-]', '-'
        $SourceDirectory = Join-Path $workRoot "source-$safeRef"
    }

    Add-ReportLine 'ZUI_WINDOWS_STAGE2_REPORT_V1'
    Add-ReportLine "generated_at=$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
    Add-ReportLine "source_ref_requested=$SourceRef"
    Add-ReportLine "source_directory=$SourceDirectory"
    Add-ReportLine "main_is_development_default=$($SourceRef -eq 'main')"
    Add-ReportLine ''

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Run this developer-environment installer as Administrator.'
    }
    if (-not [Environment]::Is64BitOperatingSystem) { throw '64-bit Windows is required.' }
    if (Test-Path -LiteralPath $SourceDirectory) {
        throw "Source target already exists and will not be overwritten: $SourceDirectory"
    }
    New-Item -ItemType Directory -Force -Path $downloadRoot | Out-Null

    Add-ReportLine '[PRECHECK]'
    Add-ReportLine 'administrator=True'
    Add-ReportLine 'windows_64bit=True'
    Add-ReportLine "node_msi_removal_authorized=$AllowNodeMsiRemoval"
    Add-ReportLine ''

    $gitExe = (Get-Command git.exe -ErrorAction SilentlyContinue).Source
    if (-not $gitExe) {
        Add-ReportLine '[GIT_INSTALL]'
        $gitInstaller = Join-Path $downloadRoot "Git-$gitVersion-64-bit.exe"
        Get-VerifiedDownload -Url $gitUrl -Destination $gitInstaller -Algorithm SHA256 -Expected $gitSha256 | Out-Null
        $gitSignature = Get-AuthenticodeSignature -LiteralPath $gitInstaller
        if ($gitSignature.Status -ne 'Valid') { throw 'Git installer signature is not valid.' }
        $gitProcess = Start-Process -FilePath $gitInstaller -ArgumentList @('/VERYSILENT','/NORESTART','/NOCANCEL','/SP-') -Wait -PassThru -WindowStyle Hidden
        if ($gitProcess.ExitCode -ne 0) { throw "Git installation failed with code $($gitProcess.ExitCode)." }
        $gitExe = Join-Path $env:ProgramFiles 'Git\cmd\git.exe'
        if (-not (Test-Path -LiteralPath $gitExe -PathType Leaf)) { throw 'Git executable was not found after installation.' }
        Add-ReportLine 'git_action=INSTALLED_VERIFIED_PACKAGE'
    } else {
        Add-ReportLine '[GIT_INSTALL]'
        Add-ReportLine 'git_action=REUSED_EXISTING'
    }
    Add-ReportLine "git_version=$((& $gitExe --version).Trim())"
    Add-ReportLine ''

    $nvmExe = (Get-Command nvm.exe -ErrorAction SilentlyContinue).Source
    $nvmHome = $env:NVM_HOME
    $nvmSymlink = $env:NVM_SYMLINK
    if (-not $nvmExe) {
        $msiEntries = @(Get-NodeMsiEntries)
        if ($msiEntries.Count -gt 0 -and -not $AllowNodeMsiRemoval) {
            throw 'An MSI Node.js installation exists. It was not removed. Review it, then rerun with -AllowNodeMsiRemoval only if you explicitly approve removal.'
        }
        if ($msiEntries.Count -gt 1) { throw 'Multiple MSI Node.js installations were found. Remove them manually after review.' }
        if ($msiEntries.Count -eq 1) {
            $entry = $msiEntries[0]
            $guid = [regex]::Match([string]$entry.UninstallString, '\{[0-9A-Fa-f-]{36}\}')
            if (-not $guid.Success) { throw 'The Node.js MSI product code could not be resolved safely.' }
            $remove = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/x',$guid.Value,'/qn','/norestart') -Wait -PassThru -WindowStyle Hidden
            if ($remove.ExitCode -eq 3010) { throw 'Node removal requires a restart. Restart Windows before continuing.' }
            if ($remove.ExitCode -ne 0) { throw "Node removal failed with code $($remove.ExitCode)." }
            Add-ReportLine "node_msi_action=REMOVED_WITH_EXPLICIT_APPROVAL version=$($entry.DisplayVersion)"
        } else {
            Add-ReportLine 'node_msi_action=NOT_PRESENT'
        }

        $nvmHome = Join-Path $env:LOCALAPPDATA 'nvm'
        $nvmSymlink = Join-Path $env:LOCALAPPDATA 'nvm-node'
        if (Test-Path -LiteralPath $nvmHome) { throw "NVM target already exists but nvm.exe is unavailable: $nvmHome" }
        if (Test-Path -LiteralPath $nvmSymlink) { throw "NVM symlink target already exists: $nvmSymlink" }
        $nvmArchive = Join-Path $downloadRoot "nvm-noinstall-$nvmVersion.zip"
        Get-VerifiedDownload -Url $nvmUrl -Destination $nvmArchive -Algorithm MD5 -Expected $nvmMd5 | Out-Null
        if ((Get-FileHash -LiteralPath $nvmArchive -Algorithm SHA256).Hash -ne $nvmSha256) { throw 'NVM archive SHA256 verification failed.' }
        New-Item -ItemType Directory -Path $nvmHome | Out-Null
        Expand-Archive -LiteralPath $nvmArchive -DestinationPath $nvmHome
        $nvmExe = Join-Path $nvmHome 'nvm.exe'
        if ((Get-AuthenticodeSignature -LiteralPath $nvmExe).Status -ne 'Valid') { throw 'NVM executable signature is not valid.' }
        @("root: $nvmHome","path: $nvmSymlink",'arch: 64','proxy: none') | Set-Content -LiteralPath (Join-Path $nvmHome 'settings.txt') -Encoding ASCII
        [Environment]::SetEnvironmentVariable('NVM_HOME',$nvmHome,'User')
        [Environment]::SetEnvironmentVariable('NVM_SYMLINK',$nvmSymlink,'User')
        $oldUserPath = [Environment]::GetEnvironmentVariable('Path','User')
        $parts = @($oldUserPath -split ';' | Where-Object { $_ -and $_ -ne '%NVM_HOME%' -and $_ -ne '%NVM_SYMLINK%' })
        $newUserPath = (@('%NVM_HOME%','%NVM_SYMLINK%') + $parts) -join ';'
        [Environment]::SetEnvironmentVariable('Path',$newUserPath,'User')
        Add-ReportLine 'nvm_action=INSTALLED_VERIFIED_PACKAGE'
    } else {
        if (-not $nvmHome -or -not $nvmSymlink) { throw 'Existing NVM is missing NVM_HOME or NVM_SYMLINK.' }
        Add-ReportLine 'nvm_action=REUSED_EXISTING'
    }
    $env:NVM_HOME = $nvmHome
    $env:NVM_SYMLINK = $nvmSymlink
    $env:Path = "$nvmHome;$nvmSymlink;$(Split-Path -Parent $gitExe);$env:Path"
    Add-ReportLine "nvm_version=$((& $nvmExe version).Trim())"
    Add-ReportLine ''

    Add-ReportLine '[NODE_AND_WEBOS_CLI]'
    $node16Dir = Install-NodeArchive -Version $node16Version -ExpectedSha256 $node16Sha256 -NvmHome $nvmHome
    $node24Dir = Install-NodeArchive -Version $node24Version -ExpectedSha256 $node24Sha256 -NvmHome $nvmHome
    Add-ReportLine "node16_version=$((& (Join-Path $node16Dir 'node.exe') --version).Trim())"
    Add-ReportLine "node24_version=$((& (Join-Path $node24Dir 'node.exe') --version).Trim())"
    & $nvmExe use $node16Version 64
    if ($LASTEXITCODE -ne 0) { throw 'Node 16 activation failed.' }
    $npm16 = Join-Path $nvmSymlink 'npm.cmd'
    $integrity = (& $npm16 view "@webos-tools/cli@$cliVersion" dist.integrity).Trim()
    if ($integrity -ne $cliIntegrity) { throw 'webOS CLI registry integrity metadata did not match.' }
    $ares = Join-Path $nvmSymlink 'ares.cmd'
    $installedCliMatches = $false
    if (Test-Path -LiteralPath $ares -PathType Leaf) {
        $installedCliVersion = ((& $ares -V 2>&1 | Select-Object -First 1).ToString()).Trim()
        $installedCliMatches = $installedCliVersion -match [regex]::Escape($cliVersion)
    }
    if (-not $installedCliMatches) {
        & $npm16 install --global "@webos-tools/cli@$cliVersion"
        if ($LASTEXITCODE -ne 0) { throw 'webOS CLI installation failed.' }
    }
    $ares = Join-Path $nvmSymlink 'ares.cmd'
    Add-ReportLine "ares_version=$((& $ares -V 2>&1 | Select-Object -First 1).ToString().Trim())"
    Add-ReportLine ''

    Add-ReportLine '[SOURCE_AND_BUILD]'
    & $gitExe clone $repositoryUrl $SourceDirectory
    if ($LASTEXITCODE -ne 0) { throw 'Repository clone failed.' }
    $resolvedOutput = @(& $gitExe -C $SourceDirectory rev-parse --verify "$SourceRef^{commit}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $resolvedOutput.Count -eq 0) { throw "Source ref '$SourceRef' was not found in the cloned repository." }
    $resolved = ([string]$resolvedOutput[0]).Trim()
    & $gitExe -C $SourceDirectory checkout --detach $resolved
    if ($LASTEXITCODE -ne 0) { throw "Checkout failed for resolved commit $resolved." }
    Add-ReportLine "source_origin=$repositoryUrl"
    Add-ReportLine "source_commit=$resolved"
    Add-ReportLine "source_is_detached_commit=True"

    Push-Location $SourceDirectory
    try {
        & $nvmExe use $node24Version 64
        if ($LASTEXITCODE -ne 0) { throw 'Node 24 activation failed.' }
        $npm24 = Join-Path $nvmSymlink 'npm.cmd'
        & $npm24 ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
        & $npm24 run build
        if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
        if (-not (Test-Path -LiteralPath (Join-Path $SourceDirectory 'dist\appinfo.json') -PathType Leaf)) { throw 'dist/appinfo.json is missing.' }
        Add-ReportLine 'source_build=PASS'

        & $nvmExe use $node16Version 64
        if ($LASTEXITCODE -ne 0) { throw 'Node 16 activation failed for packaging.' }
        $aresPackage = Join-Path $nvmSymlink 'ares-package.cmd'
        & $aresPackage dist -o dist-ipk
        if ($LASTEXITCODE -ne 0) { throw 'IPK packaging failed.' }
        $ipks = @(Get-ChildItem -LiteralPath (Join-Path $SourceDirectory 'dist-ipk') -Filter '*.ipk' -File)
        if ($ipks.Count -ne 1) { throw 'Exactly one IPK was expected.' }
        & $aresPackage -I $ipks[0].FullName
        if ($LASTEXITCODE -ne 0) { throw 'IPK inspection failed.' }
        Add-ReportLine 'ipk_package=PASS'
        Add-ReportLine "ipk_name=$($ipks[0].Name)"
        Add-ReportLine "ipk_size=$($ipks[0].Length)"
        Add-ReportLine "ipk_sha256=$((Get-FileHash -LiteralPath $ipks[0].FullName -Algorithm SHA256).Hash)"
    } finally {
        Pop-Location
    }

    Add-ReportLine ''
    Add-ReportLine '[SCOPE_GUARDS]'
    Add-ReportLine 'tv_application_installed=False'
    Add-ReportLine 'tv_device_record_changed=False'
    Add-ReportLine 'git_commit_created=False'
    Add-ReportLine 'git_push_performed=False'
    Add-ReportLine ''
    Add-ReportLine 'stage2_developer_environment=PASS'
    Add-ReportLine "active_node_after=v$node16Version"
    Save-Report
    Write-Host "TAMAM: Gelistirici ortami ve kaynak commit $resolved dogrulandi. Rapor: $reportPath" -ForegroundColor Green
} catch {
    Add-ReportLine ''
    Add-ReportLine 'stage2_developer_environment=FAIL'
    Add-ReportLine "failure=$($_.Exception.Message)"
    Save-Report
    Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Rapor: $reportPath"
    exit 1
} finally {
    if ($transcriptStarted) { Stop-Transcript | Out-Null }
}

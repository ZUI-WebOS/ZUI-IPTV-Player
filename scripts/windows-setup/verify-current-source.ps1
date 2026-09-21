[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$reportPath = Join-Path $PSScriptRoot 'verify-current-source-report.txt'
$report = [System.Collections.Generic.List[string]]::new()

function Add-ReportLine {
    param([string]$Text = '')
    $report.Add($Text)
    Write-Host $Text
}

function Save-Report {
    $report | Set-Content -LiteralPath $reportPath -Encoding UTF8
}

try {
    $sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $manifestPath = Join-Path $sourceRoot 'SOURCE_BUNDLE_MANIFEST.sha256'
    Add-ReportLine 'ZUI_CURRENT_SOURCE_VM_VERIFY_V1'
    Add-ReportLine "generated_at=$([DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
    Add-ReportLine "source_root=$sourceRoot"

    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw 'SOURCE_BUNDLE_MANIFEST.sha256 is missing.'
    }
    $manifestLines = @(Get-Content -LiteralPath $manifestPath | Where-Object { $_.Trim() })
    foreach ($line in $manifestLines) {
        if ($line -notmatch '^([0-9A-Fa-f]{64}) \*(.+)$') {
            throw "Invalid manifest line: $line"
        }
        $expected = $Matches[1].ToUpperInvariant()
        $relative = $Matches[2]
        $path = Join-Path $sourceRoot ($relative -replace '/', '\')
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Manifest file is missing: $relative"
        }
        $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
        if ($actual -ne $expected) { throw "Source integrity mismatch: $relative" }
    }
    Add-ReportLine "source_manifest_files=$($manifestLines.Count)"
    Add-ReportLine 'source_integrity=PASS'

    $nvmHomeDir = $env:NVM_HOME
    if (-not $nvmHomeDir) { $nvmHomeDir = [Environment]::GetEnvironmentVariable('NVM_HOME','User') }
    if (-not $nvmHomeDir) { throw 'NVM_HOME is unavailable.' }
    $node24Dir = Join-Path $nvmHomeDir 'v24.18.0'
    $node16Dir = Join-Path $nvmHomeDir 'v16.20.2'
    $npm24 = Join-Path $node24Dir 'npm.cmd'
    $node24 = Join-Path $node24Dir 'node.exe'
    $node16 = Join-Path $node16Dir 'node.exe'
    $ares = Join-Path $node16Dir 'ares.cmd'
    $aresPackage = Join-Path $node16Dir 'ares-package.cmd'
    foreach ($required in @($npm24,$node24,$node16,$ares,$aresPackage)) {
        if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
            throw "Required verified tool is missing: $required"
        }
    }
    Add-ReportLine "node24_version=$((& $node24 --version).Trim())"
    Add-ReportLine "node16_version=$((& $node16 --version).Trim())"
    Add-ReportLine "ares_version=$(((& $ares -V 2>&1 | Select-Object -First 1).ToString()).Trim())"

    Push-Location $sourceRoot
    try {
        $env:Path = "$node24Dir;$env:Path"
        & $npm24 ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
        & $npm24 run build
        if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
        foreach ($requiredDist in @('index.html','appinfo.json','icon.png','largeIcon.png')) {
            if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "dist\$requiredDist") -PathType Leaf)) {
                throw "Build output is missing dist/$requiredDist."
            }
        }
        Add-ReportLine 'production_build=PASS'

        $env:Path = "$node16Dir;$env:Path"
        & $aresPackage dist -o dist-ipk
        if ($LASTEXITCODE -ne 0) { throw 'IPK packaging failed.' }
        $appInfo = Get-Content -LiteralPath (Join-Path $sourceRoot 'appinfo.json') -Raw | ConvertFrom-Json
        $ipkPath = Join-Path $sourceRoot "dist-ipk\$($appInfo.id)_$($appInfo.version)_all.ipk"
        if (-not (Test-Path -LiteralPath $ipkPath -PathType Leaf)) { throw 'Expected IPK is missing.' }
        & $aresPackage -I $ipkPath
        if ($LASTEXITCODE -ne 0) { throw 'IPK inspection failed.' }
        $ipk = Get-Item -LiteralPath $ipkPath
        Add-ReportLine 'ipk_inspection=PASS'
        Add-ReportLine "ipk_name=$($ipk.Name)"
        Add-ReportLine "ipk_size=$($ipk.Length)"
        Add-ReportLine "ipk_sha256=$((Get-FileHash -LiteralPath $ipkPath -Algorithm SHA256).Hash)"
        Add-ReportLine "application_id=$($appInfo.id)"
        Add-ReportLine "application_version=$($appInfo.version)"
    } finally {
        Pop-Location
    }

    Add-ReportLine 'tv_application_installed=False'
    Add-ReportLine 'current_source_vm_verification=PASS'
    Save-Report
} catch {
    Add-ReportLine 'current_source_vm_verification=FAIL'
    Add-ReportLine "failure=$($_.Exception.Message)"
    Save-Report
    exit 1
}

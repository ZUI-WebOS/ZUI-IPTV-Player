# ZUI IPTV Player - Hybrid Node deploy pipeline
# Build (tsc + vite): Node 24
# Package + Install + Launch (ares-*): Node 16.20.2

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host "  ZUI IPTV Player - Deploy Pipeline" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor DarkGray
Write-Host ""

# ─── Yardımcı: NVM_HOME altındaki versiyonlu dizini döndürür ─────────────────
# Symlink veya PATH cache sorunlarından bağımsız, doğrudan dosya sistemi kontrolü.

function Get-NvmVersionDir {
    param([string]$Ver)

    # DIKKAT: $home PowerShell'in rezerve degiskeni — $nvmHomeDir kullaniyoruz.
    $nvmHomeDir = $env:NVM_HOME
    if (-not $nvmHomeDir) { $nvmHomeDir = [Environment]::GetEnvironmentVariable("NVM_HOME", "Machine") }
    if (-not $nvmHomeDir) { $nvmHomeDir = [Environment]::GetEnvironmentVariable("NVM_HOME", "User") }

    if ($nvmHomeDir) {
        # nvm4w: C:\Users\...\AppData\Local\nvm\v16.20.2
        foreach ($prefix in @("v", "")) {
            $candidate = Join-Path $nvmHomeDir "$prefix$Ver"
            if (Test-Path (Join-Path $candidate "node.exe")) {
                return $candidate
            }
        }
    }

    # Fallback: NVM_SYMLINK (zaten switch sonrası doğru versiyona işaret eder)
    $sym = $env:NVM_SYMLINK
    if (-not $sym) { $sym = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "Machine") }
    if (-not $sym) { $sym = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "User") }
    if ($sym -and (Test-Path (Join-Path $sym "node.exe"))) {
        return $sym
    }

    return $null
}

# ─── STEP 1: Node 24 ile TypeScript + Vite build ─────────────────────────────

Write-Host "-> [1/3] Node 24 ile build..." -ForegroundColor Yellow

$currentVer = ""
try { $currentVer = & node -v 2>$null } catch {}

if ($currentVer -notmatch "v24") {
    nvm use 24
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 24" -ForegroundColor Red; exit 1 }

    # `nvm use 24` hangi kurulu 24.x sürümünü seçtiyse NVM_SYMLINK üzerinden
    # onu kullan. Eski bir patch sürümünü sabitleyip seçimi geri alma.
    $n24dir = Get-NvmVersionDir "24"
    if ($n24dir) {
        $env:Path = "$n24dir;$env:Path"
        Write-Host "   Node 24 dir: $n24dir" -ForegroundColor Gray
    }
} else {
    Write-Host "   Zaten Node $currentVer uzerinde" -ForegroundColor Gray
}

# ─── STEP 2: Build ───────────────────────────────────────────────────────────

Write-Host "-> [2/3] TypeScript + Vite build" -ForegroundColor Yellow
cmd.exe /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: build" -ForegroundColor Red; exit 1 }

# ─── STEP 3: Node 16 + ares-cli ile paketleme / kurulum / başlatma ───────────

Write-Host ""
Write-Host "-> [3/3] Node 16.20.2 ile webOS paketleme..." -ForegroundColor Yellow

nvm use 16.20.2
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: nvm use 16.20.2" -ForegroundColor Red; exit 1 }

# NVM_HOME üzerinden doğrudan versiyonlu dizine git — symlink / PATH cache'e güvenme
$n16dir = Get-NvmVersionDir "16.20.2"

if (-not $n16dir) {
    Write-Host "" -ForegroundColor Red
    Write-Host "FAIL: Node 16.20.2 dizini bulunamadi." -ForegroundColor Red
    Write-Host "  NVM_HOME  : $env:NVM_HOME" -ForegroundColor DarkGray
    Write-Host "  NVM_SYMLINK: $env:NVM_SYMLINK" -ForegroundColor DarkGray
    exit 1
}

Write-Host "   Node 16 dir: $n16dir" -ForegroundColor Gray
# Bu dizini PATH'in BASINA ekle — ares-*.cmd ve node.exe buradan gelecek
$env:Path = "$n16dir;$env:Path"

# Dogrulama
$nodeVerCheck = & "$n16dir\node.exe" -v 2>$null
Write-Host "   node -v    : $nodeVerCheck" -ForegroundColor Gray

# ─── 3a: Paketleme ───────────────────────────────────────────────────────────

Write-Host "-> Packaging IPK (ares-package)..." -ForegroundColor Yellow

$aresPkg = Join-Path $n16dir "ares-package.cmd"
if (Test-Path $aresPkg) {
    & $aresPkg dist -o dist-ipk
} else {
    cmd.exe /c "ares-package dist -o dist-ipk"
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: ares-package" -ForegroundColor Red; exit 1 }

# ─── 3b: TV'ye kurulum ───────────────────────────────────────────────────────

Write-Host "-> Installing to TV (ares-install)..." -ForegroundColor Yellow

# appinfo.json ile aynı kimlik/sürüme ait paketi seç. Klasörde kalmış eski bir
# IPK'yı `Select-Object -First 1` ile yanlışlıkla TV'ye göndermeyelim.
$appInfo = Get-Content "appinfo.json" -Raw | ConvertFrom-Json
$expectedIpk = "dist-ipk\$($appInfo.id)_$($appInfo.version)_all.ipk"
$ipkFile = Get-Item $expectedIpk -ErrorAction SilentlyContinue
if (-not $ipkFile) {
    Write-Host "FAIL: beklenen IPK bulunamadi: $expectedIpk" -ForegroundColor Red; exit 1
}
Write-Host "   IPK: $($ipkFile.Name)" -ForegroundColor Gray

$aresInst = Join-Path $n16dir "ares-install.cmd"
if (Test-Path $aresInst) {
    & $aresInst -d tv $ipkFile.FullName
} else {
    cmd.exe /c "ares-install -d tv `"$($ipkFile.FullName)`""
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: ares-install" -ForegroundColor Red; exit 1 }

# ─── 3c: Uygulamayı başlat ───────────────────────────────────────────────────

Write-Host "-> Launching app (ares-launch)..." -ForegroundColor Yellow

$aresLaunch = Join-Path $n16dir "ares-launch.cmd"
if (Test-Path $aresLaunch) {
    & $aresLaunch -d tv com.zui.player
} else {
    cmd.exe /c "ares-launch -d tv com.zui.player"
}
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: ares-launch" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "OK - Deploy tamamlandi. ZUI IPTV Player TV'de calisiyor." -ForegroundColor Green
Write-Host ""

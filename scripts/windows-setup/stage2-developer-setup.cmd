@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ZUI IPTV Player - gelistirici ortami ve kaynak build yardimcisi
echo Bu arac TV'ye IPK yuklemez. Git commit veya push yapmaz.
echo.

set "ZUI_REMOVE_SWITCH="
set /p "ZUI_REMOVE_NODE=Mevcut MSI Node kurulumu NVM icin kaldirilmak zorunda kalirsa izin verilsin mi? [E/H]: "
if /i "%ZUI_REMOVE_NODE%"=="E" set "ZUI_REMOVE_SWITCH=-AllowNodeMsiRemoval"

if not exist "%~dp0stage2-developer-setup.ps1" (
  echo HATA: stage2-developer-setup.ps1 ayni klasorde bulunamadi.
  pause
  exit /b 3
)

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo HATA: Bu dosyayi sag tiklayip Yonetici olarak calistirin.
  pause
  exit /b 4
)

rem ExecutionPolicy Bypass is limited to this process and does not persistently
rem alter the user or machine execution policy.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0stage2-developer-setup.ps1" %ZUI_REMOVE_SWITCH%
set "ZUI_EXIT_CODE=%errorlevel%"

echo.
if not "%ZUI_EXIT_CODE%"=="0" (
  echo GELISTIRICI KURULUMU DURDU. Cikis kodu: %ZUI_EXIT_CODE%
  echo stage2-developer-setup-report.txt ve stage2-developer-setup.log dosyalarini inceleyin.
  pause
  exit /b %ZUI_EXIT_CODE%
)

echo GELISTIRICI KURULUMU VE BUILD DOGRULAMASI TAMAMLANDI.
pause
exit /b 0

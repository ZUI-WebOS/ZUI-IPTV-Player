@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ZUI IPTV Player - TV ve SSH key baglanti yardimcisi
echo Bu arac TV'ye uygulama kurmaz ve mevcut anahtarin uzerine yazmaz.
echo.

if not exist "%~dp0stage1-tv-connection.ps1" (
  echo HATA: stage1-tv-connection.ps1 ayni klasorde bulunamadi.
  pause
  exit /b 3
)

rem ExecutionPolicy Bypass only applies to this PowerShell process. It does not
rem change the machine-wide or user-wide execution policy.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0stage1-tv-connection.ps1"
set "ZUI_EXIT_CODE=%errorlevel%"

echo.
if not "%ZUI_EXIT_CODE%"=="0" (
  echo BAGLANTI KONTROLU DURDU. Cikis kodu: %ZUI_EXIT_CODE%
  echo stage1-tv-connection-report.txt dosyasini gizli bilgi icermedigini kontrol ederek destekle paylasabilirsiniz.
  pause
  exit /b %ZUI_EXIT_CODE%
)

echo BAGLANTI KONTROLU TAMAMLANDI.
echo Sonraki IPK kurulum adimi icin README.md dosyasina bakin.
pause
exit /b 0

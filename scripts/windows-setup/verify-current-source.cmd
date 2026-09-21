@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ZUI IPTV Player - aktarilan guncel kaynak VM dogrulamasi
echo Bu arac TV'ye uygulama kurmaz.
echo.

if not exist "%~dp0verify-current-source.ps1" (
  echo HATA: verify-current-source.ps1 bulunamadi.
  pause
  exit /b 3
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-current-source.ps1"
set "ZUI_EXIT_CODE=%errorlevel%"

echo.
if not "%ZUI_EXIT_CODE%"=="0" (
  echo GUNCEL KAYNAK DOGRULAMASI DURDU. Cikis kodu: %ZUI_EXIT_CODE%
  pause
  exit /b %ZUI_EXIT_CODE%
)

echo GUNCEL KAYNAK BUILD VE IPK DOGRULAMASI TAMAMLANDI.
pause
exit /b 0

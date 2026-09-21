@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ZUI IPTV Player - TV ekran goruntusu aliniyor...
echo.

where nvm >nul 2>nul
if errorlevel 1 (
  echo HATA: NVM bulunamadi.
  pause
  exit /b 1
)

call nvm use 24 >nul
if errorlevel 1 (
  echo HATA: Node 24 etkinlestirilemedi.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo HATA: Node bulunamadi.
  pause
  exit /b 1
)

node "%~dp0scripts\capture-tv-screenshot.mjs"
if errorlevel 1 (
  echo.
  echo HATA: Ekran goruntusu alinamadi.
  echo TV acik, Developer Mode etkin ve ZUI IPTV Player calisiyor olmali.
  pause
  exit /b 1
)

echo.
echo TAMAM: PNG, screenshots klasorune kaydedildi.
start "" "%~dp0screenshots"
pause
exit /b 0

@echo off
setlocal
cd /d "%~dp0"
echo Dang dong goi MB Notify Portable...
echo Khong kem lich su giao dich va ma ghep noi.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0package-portable.ps1" -OutputDirectory "%~dp0dist"
if errorlevel 1 (
  echo.
  echo Dong goi that bai. Xem thong bao loi o tren.
  pause
  exit /b 1
)
echo.
echo Da tao ZIP trong thu muc dist.
start "" "%~dp0dist"
pause

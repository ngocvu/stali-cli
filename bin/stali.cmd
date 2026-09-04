@echo off
setlocal
set "ROOT=%~dp0.."
set "DIST=%ROOT%\dist\index.js"
set "SRC=%ROOT%\src\index.ts"
set "BUN=%USERPROFILE%\.bun\bin\bun.exe"

if exist "%DIST%" (
  if exist "%BUN%" (
    "%BUN%" "%DIST%" %*
    exit /b %ERRORLEVEL%
  )
  where bun >nul 2>nul
  if %ERRORLEVEL%==0 (
    bun "%DIST%" %*
    exit /b %ERRORLEVEL%
  )
  node "%~dp0stali.js" %*
  exit /b %ERRORLEVEL%
)

if exist "%SRC%" (
  if exist "%BUN%" (
    "%BUN%" "%SRC%" %*
    exit /b %ERRORLEVEL%
  )
  where bun >nul 2>nul
  if %ERRORLEVEL%==0 (
    bun "%SRC%" %*
    exit /b %ERRORLEVEL%
  )
)

echo stali-cli: can Bun. Cai: https://bun.sh
echo hoac: bun run build
exit /b 1

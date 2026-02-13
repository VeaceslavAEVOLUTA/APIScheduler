@echo off
setlocal
if "%1"=="" (
  echo Usage: scripts\restore_db.bat ^<backup.sql^>
  exit /b 1
)
set FILE=%1
if not exist "%FILE%" (
  echo Backup file not found: %FILE%
  exit /b 1
)
set DB_NAME=%DB_NAME%
if "%DB_NAME%"=="" set DB_NAME=apischeduler
set DB_USER=%DB_USER%
if "%DB_USER%"=="" set DB_USER=postgres
set DB_HOST=%DB_HOST%
if "%DB_HOST%"=="" set DB_HOST=localhost

echo Restoring %DB_NAME% from %FILE%
psql -h %DB_HOST% -U %DB_USER% -d %DB_NAME% < %FILE%

echo Done
endlocal

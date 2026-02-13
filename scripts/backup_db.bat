@echo off
setlocal
set DB_NAME=%DB_NAME%
if "%DB_NAME%"=="" set DB_NAME=apischeduler
set DB_USER=%DB_USER%
if "%DB_USER%"=="" set DB_USER=postgres
set DB_HOST=%DB_HOST%
if "%DB_HOST%"=="" set DB_HOST=localhost
set BACKUP_DIR=%BACKUP_DIR%
if "%BACKUP_DIR%"=="" set BACKUP_DIR=backups

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f "tokens=1-4 delims=/-. " %%a in ("%date%") do set DS=%%d%%b%%c
for /f "tokens=1-3 delims=:,." %%a in ("%time%") do set TS=%%a%%b%%c
set FILE=%BACKUP_DIR%\%DB_NAME%_%DS%_%TS%.sql

echo Backing up %DB_NAME% to %FILE%
pg_dump -h %DB_HOST% -U %DB_USER% -d %DB_NAME% > %FILE%

echo Done
endlocal

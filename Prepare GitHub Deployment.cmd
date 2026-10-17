@echo off
cd /d "%~dp0"
python scripts\prepare_deployment.py
if errorlevel 1 goto done
python scripts\check_site.py --root deployment\github-pages
:done
pause

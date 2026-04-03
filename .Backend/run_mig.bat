@echo off
echo Running Alembic Revision...
python -m alembic revision --autogenerate -m "Refactor Spot Status" > mig_log.txt 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Revision Failed >> mig_log.txt
    exit /b %ERRORLEVEL%
)

echo Running Alembic Upgrade...
python -m alembic upgrade head >> mig_log.txt 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Upgrade Failed >> mig_log.txt
    exit /b %ERRORLEVEL%
)

echo DONE >> mig_log.txt

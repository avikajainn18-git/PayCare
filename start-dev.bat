@echo off
setlocal enabledelayedexpansion
REM ============================================================
REM  PayCare one-command development startup (Windows)
REM  Starts FastAPI on 127.0.0.1:8001 + Vite (prefers 5173).
REM ============================================================

set "BACKEND_PORT=8001"
set "ROOT=%~dp0"
set "VENV=%ROOT%\.venv\Scripts"
set "PY=%VENV%\python.exe"

echo ================================================
echo  PAYCARE DEV STARTUP
echo ================================================

REM ---- 1) Virtual environment -------------------------------------------
if not exist "%PY%" (
  echo [setup] Creating Python virtual environment...
  python -m venv "%ROOT%\.venv"
  if errorlevel 1 (
    echo [ERROR] Failed to create the virtual environment. Is Python installed and on PATH?
    goto :fail
  )
) else (
  echo [ok] Virtual environment found.
)

REM ---- 2) Backend dependencies ------------------------------------------
"%PY%" -c "import fastapi, uvicorn, xgboost" >nul 2>&1
if errorlevel 1 (
  echo [setup] Installing backend dependencies...
  "%PY%" -m pip install --quiet -r "%ROOT%backend\requirements.txt"
  if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed.
    goto :fail
  )
) else (
  echo [ok] Backend dependencies installed.
)

REM ---- 3) Trained model --------------------------------------------------
if not exist "%ROOT%backend\ml\model.pkl" (
  echo [setup] Model not found - training model.pkl now...
  "%PY%" "%ROOT%backend\ml\train.py"
  if errorlevel 1 (
    echo [ERROR] Model training failed.
    goto :fail
  )
) else (
  echo [ok] Trained model found.
)

REM ---- 4) Frontend dependencies ------------------------------------------
if not exist "%ROOT%frontend\node_modules" (
  echo [setup] Installing frontend dependencies...
  pushd "%ROOT%frontend"
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] Frontend dependency installation failed. Is Node/npm installed?
    popd
    goto :fail
  )
  popd
) else (
  echo [ok] Frontend dependencies installed.
)

REM ---- 5) Backend: reuse a healthy instance, otherwise free the port ------
REM Health first: if a PayCare API already answers here, reuse it instead of
REM killing it (safer than PID-table parsing, which can misfire).
curl -s -f -o nul http://127.0.0.1:%BACKEND_PORT%/api/health 2>nul
if not errorlevel 1 (
  echo [ok] PayCare backend already healthy on port %BACKEND_PORT% - reusing it.
  goto :backend_running
)

REM Free the port: kill ONLY listeners whose local address ends in :8001.
REM (A single findstr /r with spaces splits into OR-patterns and would kill
REM unrelated listeners, so chain two literal, space-free filters instead.)
for /f "tokens=5" %%P in ('netstat -a -n -o ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
  echo [cleanup] Port %BACKEND_PORT% held by PID %%P - stopping it...
  taskkill /PID %%P /T /F >nul 2>&1
)
ping -n 2 127.0.0.1 >nul

REM Fail loudly if a web server still answers on the port after cleanup.
curl -s -f -o nul http://127.0.0.1:%BACKEND_PORT%/api/health 2>nul
if not errorlevel 1 (
  echo [ERROR] Port %BACKEND_PORT% is still in use by another web server. Close it and re-run.
  goto :fail
)

REM ---- 6) Start backend ---------------------------------------------------
echo [start] FastAPI starting on http://127.0.0.1:%BACKEND_PORT% ...
start "PayCare Backend" cmd /k ""%PY%" -m uvicorn backend.app.main:app --reload --port %BACKEND_PORT%"

:backend_running

REM ---- 7) Wait for backend health ----------------------------------------
set /a TRIES=0
:wait_backend
set /a TRIES+=1
if %TRIES% gtr 30 (
  echo [ERROR] Backend did not become healthy within 30s. Check the PayCare Backend window.
  goto :fail
)
curl -s -f -o nul http://127.0.0.1:%BACKEND_PORT%/api/health 2>nul
if errorlevel 1 (
  ping -n 2 127.0.0.1 >nul
  goto :wait_backend
)
echo [ok] Backend healthy: PAYCARE BACKEND - http://127.0.0.1:%BACKEND_PORT%
echo [ok] API docs:            http://127.0.0.1:%BACKEND_PORT%/docs

REM ---- 8) Start frontend ---------------------------------------------------
echo [start] Vite starting (prefers http://localhost:5173, auto-falls back if busy)...
start "PayCare Frontend" cmd /k "cd /d "%ROOT%frontend" && call npm run dev"

REM ---- 9) Wait for Vite and report the ACTUAL URL it picked ----------------
set "FRONT_URL="
set /a FTRIES=0
:wait_frontend
set /a FTRIES+=1
if %FTRIES% gtr 30 (
  echo [WARN] Could not confirm the frontend port automatically. Check the PayCare Frontend window.
  goto :done
)
curl -s -o nul http://localhost:5173 2>nul
if not errorlevel 1 (
  set "FRONT_URL=http://localhost:5173"
  goto :front_ok
)
curl -s -o nul http://localhost:5174 2>nul
if not errorlevel 1 (
  set "FRONT_URL=http://localhost:5174"
  goto :front_ok
)
ping -n 2 127.0.0.1 >nul
goto :wait_frontend

:front_ok
echo [ok] Frontend running: PAYCARE FRONTEND - !FRONT_URL!
start "" !FRONT_URL!

:done
echo ================================================
echo  PAYCARE IS RUNNING
echo  BACKEND  -  http://127.0.0.1:%BACKEND_PORT%
echo  FRONTEND -  !FRONT_URL!
echo  Close the two server windows to stop.
echo ================================================
goto :eof

:fail
echo ================================================
echo  STARTUP FAILED - see the [ERROR] message above.
echo ================================================
exit /b 1

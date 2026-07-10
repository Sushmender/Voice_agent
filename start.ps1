#!/usr/bin/env powershell
# start.ps1 ??? Start all services for the Voice AI Agent
# Usage: .\start.ps1

Write-Host "=== Voice AI Agent ??? Startup ===" -ForegroundColor Cyan

# Check .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Copy .env.example and fill in your keys." -ForegroundColor Red
    exit 1
}

# Check venv exists
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found. Run: python -m venv .venv ; .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Starting FastAPI server (port 8000)..." -ForegroundColor Yellow
Write-Host "(Note: The FastAPI server automatically launches the voice agent pipeline when a user connects)" -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .venv\Scripts\uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Ready! Open http://localhost:8000/test in your browser." -ForegroundColor Green
Write-Host ""
Write-Host "=== Services started ===" -ForegroundColor Green
Write-Host "  FastAPI:       http://localhost:8000"
Write-Host "  Health check:  http://localhost:8000/health"
Write-Host "  API docs:      http://localhost:8000/docs"
Write-Host ""
Write-Host "Now open the test_client.html in your browser,"
Write-Host "or use a LiveKit JS client to test the voice pipeline."


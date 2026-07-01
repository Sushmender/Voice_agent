#!/usr/bin/env powershell
# start.ps1 — Start all services for the Voice AI Agent
# Usage: .\start.ps1

Write-Host "=== Voice AI Agent — Startup ===" -ForegroundColor Cyan

# Check .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Copy .env.example and fill in your keys." -ForegroundColor Red
    exit 1
}

# Check venv exists
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "ERROR: Virtual environment not found. Run: python -m venv .venv && .venv\Scripts\pip install -r requirements.txt" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Starting FastAPI server (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .venv\Scripts\uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "Waiting for FastAPI to start..."
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Step 2: Starting LiveKit Agent Worker..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; .venv\Scripts\python backend\agent_worker.py dev"

Write-Host ""
Write-Host "=== Services started ===" -ForegroundColor Green
Write-Host "  FastAPI:       http://localhost:8000"
Write-Host "  Health check:  http://localhost:8000/health"
Write-Host "  API docs:      http://localhost:8000/docs"
Write-Host ""
Write-Host "Now open the LiveKit Playground (https://agents-playground.livekit.io/)"
Write-Host "or a LiveKit JS client to test the voice pipeline."

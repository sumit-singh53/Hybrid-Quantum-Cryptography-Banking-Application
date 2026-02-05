# Development Setup

## Quick Start with Hot Reload

### Option 1: Using npm (Recommended)
From the project root directory:
```bash
npm start
```

This will start both servers with hot reload enabled:
- **Backend** (Flask): http://localhost:5000
- **Frontend** (React): http://localhost:3000

### Option 2: Using Shell Script
From the project root directory:
```bash
./start-dev.sh
```

## Hot Reload Features

### Backend (Flask)
- **Auto-reload enabled** via `debug=True` in `run.py`
- Automatically restarts when Python files change
- Shows restart messages in the terminal

### Frontend (React)
- **Hot Module Replacement (HMR)** enabled via webpack dev server
- Updates in browser without full page reload
- Shows compilation status in the terminal

## What Changes Trigger Reload?

### Backend Auto-Reload
- Any `.py` file changes in `/backend/app/`
- Route modifications
- Service layer updates
- Model changes
- Configuration updates

### Frontend Hot Reload
- Any `.js` or `.jsx` file changes in `/frontend/src/`
- Component updates
- Style changes
- Route modifications

## Tips

1. **Keep one terminal open** running `npm start` from the root directory
2. **Both servers will restart automatically** when you save changes
3. **Flask restarts** take 1-2 seconds
4. **React hot reloads** almost instantly
5. **Check terminal output** for compilation errors or warnings

## Stopping Servers

Press `Ctrl+C` in the terminal where servers are running.

## Troubleshooting

### Port Already in Use
If you see port errors, kill existing processes:
```bash
# Kill backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Kill frontend (port 3000)
lsof -ti:3000 | xargs kill -9
```

Then restart with `npm start`.

### Backend Not Auto-Reloading
Make sure `debug=True` is set in `backend/run.py`:
```python
app.run(host="0.0.0.0", port=5000, debug=True)
```

### Frontend Not Hot Reloading
Make sure you're using `npm start` (not `npm run build`).

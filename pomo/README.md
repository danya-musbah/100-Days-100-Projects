# POMO

A simple and modern Pomodoro timer built to help manage focus and break sessions.

## Live Demo

[View pomo](https://danya-musbah.github.io/100-Days-100-Projects/pomp/)


## Features

- Focus, Short Break, and Long Break modes
- Customizable session durations
- Start, pause, reset, and skip controls
- Session and daily focus tracking
- Sound and browser notifications
- Settings saved with LocalStorage
- Responsive design for different screen sizes

## Tech Stack

```
HTML5
CSS3
Vanilla JavaScript (ES modules)
Browser APIs
LocalStorage
Web Notifications API
Web Audio API
```

No frameworks, no build step, no external dependencies or CDNs.

## Project Structure

```
pomo/
├── index.html          
├── manifest.json        
├── sw.js                
├── README.md
│
├── css/
│   └── styles.css        
│
├── js/
│   ├── app.js             
│   ├── timer.js           
│   ├── storage.js          
│   ├── notifications.js    
│   ├── audio.js             
│   └── ui.js               
│
└── assets/
    └── icon.svg           
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Start, pause, or resume the timer |
| `R` | Reset the current session |
| `S` | Skip to the next session |
| `1` | Switch to Focus |
| `2` | Switch to Short Break |
| `3` | Switch to Long Break |

Shortcuts are disabled while typing in an input field or while a modal is open.

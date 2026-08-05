// ==========================================================================
// J.A.R.V.I.S. SYSTEM MAINFRAME LOCAL SERVER (Dynamic Launcher Edition)
// ==========================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');

const PORT = 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

// Authorized direct action commands
const ALLOWED_SYSTEM_ACTIONS = {
    'volume_up': 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"',
    'volume_down': 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"',
    'volume_mute': 'powershell -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"'
};

// Aliases for common applications to system executables and URI handlers
const APP_ALIASES = {
    'vs code': 'code',
    'vscode': 'code',
    'visual studio code': 'code',
    'chrome': 'chrome',
    'google chrome': 'chrome',
    'browser': 'chrome',
    'edge': 'msedge',
    'microsoft edge': 'msedge',
    'camera': 'microsoft.windows.camera:',
    'notepad': 'notepad',
    'calculator': 'calc',
    'calc': 'calc',
    'paint': 'mspaint',
    'mspaint': 'mspaint',
    'word': 'winword',
    'excel': 'excel',
    'powerpoint': 'powerpnt',
    'explorer': 'explorer',
    'file explorer': 'explorer',
    'files': 'explorer',
    'settings': 'ms-settings:',
    'spotify': 'spotify',
    'discord': 'discord',
    'steam': 'steam'
};

function launchApplication(executableName, callback) {
    if (process.platform === 'win32') {
        // `start` is a cmd built-in and must receive an empty title before the URI.
        execFile('cmd.exe', ['/d', '/s', '/c', `start "" "${executableName}"`], callback);
        return;
    }

    if (process.platform === 'darwin') {
        if (executableName === 'microsoft.windows.camera:') {
            execFile('open', ['-a', 'Photo Booth'], callback);
            return;
        }
        execFile('open', ['-a', executableName], callback);
        return;
    }

    if (executableName === 'microsoft.windows.camera:') {
        execFile('sh', ['-c', 'if command -v cheese >/dev/null; then exec cheese; elif command -v guvcview >/dev/null; then exec guvcview; elif command -v xdg-open >/dev/null; then exec xdg-open v4l2:///dev/video0; else exit 127; fi'], callback);
        return;
    }

    if (executableName.endsWith(':')) {
        execFile('xdg-open', [executableName], callback);
        return;
    }

    execFile(executableName, [], callback);
}

const server = http.createServer((req, res) => {
    // API endpoint: Local laptop automation control
    if (req.url === '/api/execute' && req.method !== 'POST') {
        res.writeHead(405, {
            'Content-Type': 'application/json',
            'Allow': 'POST'
        });
        res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
        return;
    }

    if (req.method === 'POST' && req.url === '/api/execute') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const action = payload.action;
                const param = payload.param;
                
                if (!action) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Action parameter required' }));
                    return;
                }
                
                let runCommand;
                
                if (action === 'open_app') {
                    if (!param) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Param (app name) required for open_app action' }));
                        return;
                    }
                    
                    // Sanitize param to prevent command injection
                    const sanitizedParam = param.toLowerCase().trim().replace(/[^a-zA-Z0-9\s\-_:]/g, '');
                    const executableName = APP_ALIASES[sanitizedParam] || sanitizedParam;

                    console.log(`[SYS EXEC] Launching app: ${executableName} on ${process.platform}`);
                    runCommand = callback => launchApplication(executableName, callback);
                } else {
                    const shellCommand = ALLOWED_SYSTEM_ACTIONS[action];
                    if (shellCommand) {
                        runCommand = callback => exec(shellCommand, callback);
                    }
                }
                
                if (!runCommand) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: `Action '${action}' is not authorized or supported.` }));
                    return;
                }
                
                runCommand((err, stdout, stderr) => {
                    if (err) {
                        console.error(`[SYS ERROR] Execution failed: ${err.message}`);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: `Command executed successfully.` }));
                });
                
            } catch (parseError) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
            }
        });
        return;
    }

    // Static files serving
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access Denied');
        return;
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404: Mainframe module not found</h1>', 'utf-8');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Internal System Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, 'localhost', () => {
    console.log('\n================================================================');
    console.log('J.A.R.V.I.S. DYNAMIC AUTOMATION MAINFRAME ACTIVE');
    console.log(`Local Web Link: http://localhost:${PORT}`);
    console.log('================================================================\n');
});

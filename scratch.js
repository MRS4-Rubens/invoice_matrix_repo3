const { spawn } = require('node:child_process');
const pty = require('node:pty'); // pty might not be installed

// Instead of pty, maybe we can just patch process in a required script?

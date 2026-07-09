const tty = require('tty');

process.stdout.isTTY = true;
process.stdin.isTTY = true;
process.stdin.setRawMode = () => {};

// intercept stdout to see what is asked
const originalWrite = process.stdout.write;
process.stdout.write = function (chunk, ...args) {
    const str = chunk.toString();
    // originalWrite.apply(process.stdout, [chunk, ...args]); // print to real stdout
    process.stderr.write(chunk); // write to stderr so we can see it
    
    if (str.includes('rename')) {
        process.stdin.emit('data', Buffer.from('y\r'));
    } else if (str.includes('drop')) {
        process.stdin.emit('data', Buffer.from('y\r'));
    } else if (str.includes('sure')) {
        process.stdin.emit('data', Buffer.from('y\r'));
    }
    return true;
};

require('./node_modules/drizzle-kit/bin.cjs');

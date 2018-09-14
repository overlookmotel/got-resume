'use strict';

// Modules
const fs = require('fs');

const readStream = fs.createReadStream('/Users/jim/Downloads/ubuntu.iso');
const writeStream = fs.createWriteStream('/Users/jim/Downloads/ubuntu2.iso');

console.log('Piping');

readStream.pipe(writeStream);

readStream.on('open', () => console.log('Read stream opened'));
readStream.on('end', () => console.log('Read stream ended'));
readStream.on('close', () => console.log('Read stream closed'));
readStream.on('finish', () => console.log('Read stream finished'));
readStream.on('unpipe', () => console.log('Read stream unpiped'));
readStream.on('complete', () => console.log('Read stream completed'));
writeStream.on('end', () => console.log('Write stream ended'));
writeStream.on('close', () => console.log('Write stream closed'));
writeStream.on('finish', () => console.log('Write stream finished'));
writeStream.on('unpipe', () => console.log('Write stream unpiped'));
writeStream.on('complete', () => console.log('Write stream completed'));

setTimeout(() => console.log('Timeout'), 5 * 1000);

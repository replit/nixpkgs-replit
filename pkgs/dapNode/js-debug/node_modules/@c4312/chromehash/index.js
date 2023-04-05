const { hash } = require('./pkg/chromehash');

const output = Buffer.alloc(4 * 5);

exports.hash = input => {
  hash(normalize(input), output);
  return output.toString('hex');
};

const hasUTF8BOM = buffer =>
  buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
const hasUtf16LEBOM = buffer => buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;
const hasUtf16BEBOM = buffer => buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff;

const normalize = buffer => {
  if (hasUTF8BOM(buffer)) {
    return utf8ToUtf16(buffer.slice(3));
  }

  if (hasUtf16LEBOM(buffer)) {
    return buffer.slice(2);
  }

  if (hasUtf16BEBOM(buffer)) {
    return buffer.slice(2).swap16();
  }

  return utf8ToUtf16(buffer);
}

const utf8ToUtf16 = buffer => Buffer.from(buffer.toString('utf8'), 'utf16le');


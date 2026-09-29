const BadTokenError = { code: 'BAD_TOKEN' }

function chunkArray(arr, size) {
  return arr.length > size
      ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
      : [arr];
}

function streamFilename(stream) {
  const titleParts = stream.title.replace(/\n👤.*/s, '').split('\n');
  const filePath = titleParts.pop();
  const filename = titleParts.length
      ? filePath.split('/').pop()
      : filePath;
  return encodeURIComponent(filename)
}

// Whether filename ends with expectedFilename; '�' in the expected name
// (an undecodable character) matches anything.
function sameFilename(filename, expectedFilename) {
  const offset = filename.length - expectedFilename.length;
  for (let i = 0; i < expectedFilename.length; i++) {
    if (filename[offset + i] !== expectedFilename[i] && expectedFilename[i] !== '�') {
      return false;
    }
  }
  return true;
}

module.exports = { chunkArray, BadTokenError, streamFilename, sameFilename }

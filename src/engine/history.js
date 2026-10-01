function copy(snapshot) {
  const data = new Uint8ClampedArray(snapshot.data);
  return typeof ImageData === 'function'
    ? new ImageData(data, snapshot.width, snapshot.height)
    : { width: snapshot.width, height: snapshot.height, data };
}

function equal(a, b) {
  if (a.width !== b.width || a.height !== b.height || a.data.length !== b.data.length) return false;
  for (let index = 0; index < a.data.length; index += 1) {
    if (a.data[index] !== b.data[index]) return false;
  }
  return true;
}

/** Synchronous pixel history. All retained snapshots fit inside the configured budget. */
export class SnapshotHistory {
  constructor(initial, { maxEntries = 30, maxBytes = 128 * 1024 * 1024 } = {}) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
    this.maxBytes = Math.max(1, Math.floor(maxBytes));
    this.reset(initial);
  }

  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.entries.length - 1; }
  get length() { return this.entries.length; }
  get byteLength() { return this.bytes; }

  reset(snapshot) {
    this.assertSize(snapshot);
    this.entries = [copy(snapshot)];
    this.index = 0;
    this.bytes = snapshot.data.byteLength;
  }

  assertSize(snapshot) {
    if (snapshot.data.byteLength > this.maxBytes) {
      throw new RangeError('A document snapshot exceeds the history memory limit.');
    }
  }

  push(snapshot) {
    this.assertSize(snapshot);
    if (equal(this.entries[this.index], snapshot)) return false;
    this.entries.splice(this.index + 1);
    this.bytes = this.entries.reduce((total, entry) => total + entry.data.byteLength, 0);
    this.entries.push(copy(snapshot));
    this.bytes += snapshot.data.byteLength;
    while (this.entries.length > this.maxEntries || this.bytes > this.maxBytes) {
      this.bytes -= this.entries.shift().data.byteLength;
    }
    this.index = this.entries.length - 1;
    return true;
  }

  undo() {
    if (!this.canUndo) return null;
    this.index -= 1;
    return copy(this.entries[this.index]);
  }

  redo() {
    if (!this.canRedo) return null;
    this.index += 1;
    return copy(this.entries[this.index]);
  }
}

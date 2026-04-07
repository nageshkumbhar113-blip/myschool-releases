const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const assetsDir = path.join(root, 'assets')
fs.mkdirSync(assetsDir, { recursive: true })

function crc32(buffer) {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0)
  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

function png(width, height, rgba) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rows = []
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4
      const border = x < 20 || y < 20 || x >= width - 20 || y >= height - 20
      const fill = border ? [255,255,255,255] : rgba
      row[offset] = fill[0]
      row[offset + 1] = fill[1]
      row[offset + 2] = fill[2]
      row[offset + 3] = fill[3]
    }
    rows.push(row)
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows))
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function icoFromPng(pngBuffer) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 0
  entry[1] = 0
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, pngBuffer])
}

const icons = [
  { name: 'school-icon', color: [37, 99, 235, 255] },
  { name: 'admin-icon', color: [127, 29, 29, 255] },
]

for (const icon of icons) {
  const pngBuffer = png(256, 256, icon.color)
  fs.writeFileSync(path.join(assetsDir, `${icon.name}.png`), pngBuffer)
  fs.writeFileSync(path.join(assetsDir, `${icon.name}.ico`), icoFromPng(pngBuffer))
}

console.log('Electron icons generated in assets/.')

/**
 * create-release.mjs
 * Usage: node scripts/create-release.mjs <github-token>
 *
 * Creates a GitHub release for the current package.json version and uploads:
 *   - MY_School-App-Setup.exe
 *   - latest.yml
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const version = pkg.version

const TOKEN   = process.argv[2]
const OWNER   = 'nageshkumbhar113-blip'
const REPO    = 'myschool-releases'
const TAG     = `v${version}`
const NAME    = `MY School App v${version}`
const BODY    = `## What's new in v${version}\n\n- Major v4.0.0 release\n- Includes the latest local app, auth, template, and stability updates from this branch`
const EXE     = path.join(ROOT, 'release', 'school', 'MY_School-App-Setup.exe')
const YML     = path.join(ROOT, 'release', 'school', 'latest.yml')

if (!TOKEN) {
  console.error('Usage: node scripts/create-release.mjs <github-token>')
  process.exit(1)
}

async function api(method, endpoint, body) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept:        'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text}`)
  return JSON.parse(text)
}

async function uploadAsset(uploadUrl, filePath, contentType) {
  const fileName = path.basename(filePath)
  const data = fs.readFileSync(filePath)
  // uploadUrl looks like: https://uploads.github.com/repos/.../assets{?name,label}
  const url = uploadUrl.replace('{?name,label}', '') + `?name=${encodeURIComponent(fileName)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization:   `token ${TOKEN}`,
      Accept:          'application/vnd.github+json',
      'Content-Type':  contentType,
      'Content-Length': data.length,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: data,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${text}`)
  console.log(`  uploaded: ${fileName}`)
  return JSON.parse(text)
}

async function main() {
  console.log(`Creating release ${TAG} …`)

  // Check if release already exists and delete it
  try {
    const existing = await api('GET', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
    console.log(`  deleting existing release ${TAG} …`)
    await api('DELETE', `/repos/${OWNER}/${REPO}/releases/${existing.id}`)
    // Also delete the tag
    try { await api('DELETE', `/repos/${OWNER}/${REPO}/git/refs/tags/${TAG}`) } catch {}
  } catch {}

  const release = await api('POST', `/repos/${OWNER}/${REPO}/releases`, {
    tag_name:         TAG,
    target_commitish: 'clean-main',
    name:             NAME,
    body:             BODY,
    draft:            false,
    prerelease:       false,
  })
  console.log(`  release created: ${release.html_url}`)

  console.log('  uploading assets …')
  await uploadAsset(release.upload_url, YML, 'application/x-yaml')
  await uploadAsset(release.upload_url, EXE, 'application/octet-stream')

  console.log('\nDone! Release URL:', release.html_url)
}

main().catch(err => { console.error(err.message); process.exit(1) })

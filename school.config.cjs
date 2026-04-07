module.exports = {
  appId: 'com.myschool.app',
  productName: 'MY_School App',
  directories: {
    output: 'release/school',
    buildResources: 'assets',
  },
  toolsets: {
    winCodeSign: '1.0.0',
  },
  files: [
    'dist/**/*',
    'electron/school/**/*',
    'assets/**/*',
    'package.json',
  ],
  extraMetadata: {
    main: 'electron/school/main.cjs',
  },
  asarUnpack: [
    '**/*.node',
    'node_modules/better-sqlite3/**/*',
  ],
  artifactName: 'MY_School-App-Setup.${ext}',
  win: {
    target: 'nsis',
    icon: 'assets/school-icon.ico',
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'MY_School App',
    installerIcon: 'assets/school-icon.ico',
    uninstallerIcon: 'assets/school-icon.ico',
    installerHeaderIcon: 'assets/school-icon.ico',
    deleteAppDataOnUninstall: false,
  },
  publish: {
    provider: 'github',
    owner: 'nageshkumbhar113-blip',
    repo: 'myschool-releases',
    private: false,
  },
}



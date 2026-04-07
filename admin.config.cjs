module.exports = {
  appId: 'com.myschool.admin',
  productName: 'MY_School Admin Tool',
  directories: {
    output: 'release/admin',
    buildResources: 'assets',
  },
  toolsets: {
    winCodeSign: '1.0.0',
  },
  files: [
    'dist/**/*',
    'electron/admin/**/*',
    'electron/school/sqlite.cjs',
    'electron/school/auth-handlers.cjs',
    'electron/school/meta-handlers.cjs',
    'assets/**/*',
    'package.json',
  ],
  extraMetadata: {
    main: 'electron/admin/main.cjs',
  },
  artifactName: 'MY_School-Admin-Setup.${ext}',
  win: {
    target: 'nsis',
    icon: 'assets/admin-icon.ico',
    signAndEditExecutable: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'MY_School Admin Tool',
    installerIcon: 'assets/admin-icon.ico',
    uninstallerIcon: 'assets/admin-icon.ico',
    installerHeaderIcon: 'assets/admin-icon.ico',
    deleteAppDataOnUninstall: false,
  },
}

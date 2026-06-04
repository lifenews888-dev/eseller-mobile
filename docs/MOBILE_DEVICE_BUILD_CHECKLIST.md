# eseller-mobile device build checklist

Use this checklist before handing a native build to testers.

## Preflight

Before release or tester builds, bump `expo.version` and
`android.versionCode` in `app.json`. Keep `package.json` version aligned with
`expo.version`.

Run the offline P0 suite first:

```bash
npm run smoke:p0
```

PowerShell:

```powershell
npm.cmd run smoke:p0
```

Or run the full release preflight, which runs the offline P0 suite and then
prints the local device-build doctor report. This command does not upload to
EAS or run live API smoke:

```bash
npm run release:preflight
```

PowerShell:

```powershell
npm.cmd run release:preflight
```

Check whether this machine can run EAS or local Android build tooling:

```bash
npm run doctor:device-build
```

PowerShell:

```powershell
npm.cmd run doctor:device-build
```

Doctor warnings are informational. Missing Java, Android SDK, ADB, Gradle, or
global EAS CLI means that build path is unavailable on this machine; it does
not mean the app config is broken.

Optional live backend smoke, when a seller test account is available:

```bash
ESELLER_API_TOKEN=<seller-jwt> npm run smoke:api:auth
```

PowerShell:

```powershell
$env:ESELLER_API_TOKEN="<seller-jwt>"; npm.cmd run smoke:api:auth
```

## Android internal build

The configured preview profile uses EAS internal distribution and points at
`https://eseller.mn/api`:

```bash
npx eas-cli build --profile preview --platform android
```

PowerShell:

```powershell
npx.cmd eas-cli build --profile preview --platform android
```

When the build finishes, open the Expo build page on the Android device and
install the APK. Android may ask to allow installs from the browser or Expo.

Important: EAS Build uploads this project to Expo's build service. Do not run
the command until the project owner approves that upload for this workspace.

## iOS internal build

iOS device install requires Apple Developer provisioning or TestFlight. A direct
APK-style download is not available on iOS.

```bash
npx eas-cli build --profile preview --platform ios
```

## Local native build fallback

Local Android builds require Java, Android SDK, ADB, and Gradle. If those are
installed, generate native folders and build locally instead of uploading to EAS:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The generated APK is under `android/app/build/outputs/apk/release/`.

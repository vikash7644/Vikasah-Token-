# VKT Merchant Studio — Android APK build

This project packages the existing static Merchant Studio web app as an Android application using Capacitor.

## Build an APK in GitHub Actions

1. Open the repository's **Actions** tab.
2. Select **Build Android APK**.
3. Choose **Run workflow** after this workflow is available on the default branch, or open the pull request to trigger the PR build.
4. Download the artifact named `vkt-merchant-studio-debug-apk`.
5. Extract the artifact and install `app-debug.apk` on an Android device.

The build runs on GitHub-hosted Ubuntu with Java 17 and Node.js 20. No Termux or local Android build tools are required.

## Important limitations

- This produces a **debug APK for testnet testing**, not a Play Store release or a production-signed APK.
- VKT contract deployment is separate. Enter only the verified BNB Smart Chain testnet contract address.
- Wallet connection requires a compatible Android wallet/browser that exposes an EIP-1193 provider to the app's WebView. Wallet deep-link compatibility must be tested on actual devices; it is not guaranteed by this first APK build.
- Ethers.js and QRCode.js are currently loaded from public CDNs, so the app needs an internet connection and those dependencies should be pinned/self-hosted before production.
- No seed phrase or private key is collected by this app.
- Do not use this testnet build for real funds.

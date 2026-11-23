# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] typing =A1+100 into B1 shows 110 in B1, replacing the previous value
- Location: tests/acceptance.spec.ts:83:1

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

╔════════════════════════════════════════════════════════════════════════════════════════════════╗
║ Looks like you launched a headed browser without having a XServer running.                     ║
║ Set either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright. ║
║                                                                                                ║
║ <3 Playwright Team                                                                             ║
╚════════════════════════════════════════════════════════════════════════════════════════════════╝
Call log:
  - <launching> /opt/ms-playwright/chromium-1255/chrome-linux64/chrome --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,DestroyProfileOnBrowserClose,HttpsUpgrades,HttpsFirstBalancedModeAutoEnable,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,AvoidCorsURLLoaderRestartOnRedirect,TcpPortRandomizationWin,OptimizationHints,NetworkTimeServiceQuerying,AimEnabled,PreconnectToSearch,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface,SkipListAccountsWithoutGaiaCookies --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --disable-updater-scheduler --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --enable-unsafe-swiftshader --edge-skip-compat-layer-relaunch --disable-stack-profiler --disable-infobars --disable-sync --do-not-de-elevate --no-sandbox --user-data-dir=/tmp/playwright_chromiumdev_profile-zftmxA --remote-debugging-pipe --no-startup-window
  - <launched> pid=3712451
  - [pid=3712451][err] [3712451:3712451:1123/125750.724998:ERROR:ui/ozone/platform/x11/ozone_platform_x11.cc:259] Missing X server or $DISPLAY
  - [pid=3712451][err] [3712451:3712451:1123/125750.725053:ERROR:ui/aura/env.cc:262] The platform failed to initialize.  Exiting.
  - [pid=3712451][err] [3712451:3712468:1123/125750.725836:ERROR:dbus/bus.cc:405] Failed to connect to the bus: Could not parse server address: Unknown address type (examples of valid types are "tcp" and on UNIX "unix")
  - [pid=3712451] <gracefully close start>
  - [pid=3712451] <kill>
  - [pid=3712451] <will force kill>
  - [pid=3712451] <process did exit: exitCode=1, signal=null>
  - [pid=3712451] starting temporary directories cleanup
  - [pid=3712451] finished temporary directories cleanup
  - [pid=3712451] <gracefully close end>

```
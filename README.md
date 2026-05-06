# Timed Walk App

Apache Cordova app that allows people to perform timed walk tests, like the 6-minute walk test.
The algorithm that computes the distance from the GPS is the same as the one used in [this paper](https://mhealth.jmir.org/2020/1/e13756/).

This app is not certified as a medical device and should be used only for general wellbeing or as a home-based complement to more rigorous clinical assessment.

## Build Setup

You need:

- Nodejs (recommended version 20.14.0)
- Apache Cordova (tested with version 12.0.0)

Then run:

```bash
npm install
cordova prepare
```

Prepare a `.env.local` file if you want to run simulated modules with:

```env
# as for Vue CLI 'production' in production mode, 'test' in test mode, and defaults to 'development' otherwise
NODE_ENV=development

# if true, debug logs will be printed in the console
VUE_APP_DEBUG=true

# possible values: 'real' (default) for real API, 'mock' for simulated API
VUE_APP_API=real

# base URL for API calls, used in 'real' mode, ignored in 'mock' mode
VUE_APP_API_URL=http://localhost:3000

# possible values: 'real' (default) for real geolocation api, 'mock', 'csv', 'txt'
VUE_APP_GPS=mock

# 'real' (default) for real web motion API, 'mock' for simulated, 'none' for missing support
VUE_APP_MOTION=none

# possible values: 'real' (default) uses cordova pedometer plugin, 'mock' for simulated, 'none' for missing support
VUE_APP_STEPCOUNTER=none

# possible values: 'real' (default) uses cordova native storage plugin, 'local' for browser localStorage
VUE_APP_STORAGE=local

# possible values: 'real' (default) uses cordova file plugin, 'localStorage' for browser simulation, 'mock' for empty module for testing
VUE_APP_FILES=localStorage

```

## Unit tests

```bash
node --test
```

add `--watch` for live reload

## Run

Emulated on web at localhost:8080

```bash
npm run serve
```

Run it on device:

```bash
npm run build
cordova run
```

## Deploy

```bash
npm run build
cordova prepare
cordova build
```

Then you need to sign the app and release it. Seek instructions online on how to do it.

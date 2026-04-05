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

# possible values: 'real' (default), 'mock', 'csv', 'txt'
VUE_APP_GPS=txt

# 'real' (default) for real device, 'mock' for simulated
VUE_APP_MOTION=mock

# possible values: 'real' (default), 'mock' for simulated
VUE_APP_STEPCOUNTER=mock

# possible values: 'real' (default) for app, 'local' for testing in browser
VUE_APP_STORAGE=local

# possible values: 'real' (default) for app, 'localStorage' for browser, 'mock' for nothing
VUE_APP_FILES=mock
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

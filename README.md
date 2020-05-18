# Timed Walk App

Apache Cordova app that allows people to perform time walk tests, like the 6-minute walk test.
The algorithm that computes the distance from the GPS is the same as the one used in [this paper](https://mhealth.jmir.org/2020/1/e13756/).

This app is not certified as a medical device and should be used only for general wellbeing or as a home-based complement to more rigorous clinical assessment.

## Build Setup

You need:

- Nodejs
- Apache Cordova

The run

``` bash
# install dependencies
npm install
cordova prepare
```

## Run

``` bash
# serve with hot reload at localhost:8080
npm run dev
```

Then:
``` bash
cordova run
```

## Deploy

``` bash
# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

Then you need to sign the app and release it. Seek instructions online on how to do it.

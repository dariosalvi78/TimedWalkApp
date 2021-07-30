# Timed Walk App

Apache Cordova app that allows people to perform timed walk tests, like the 6-minute walk test.
The algorithm that computes the distance from the GPS is the same as the one used in [this paper](https://mhealth.jmir.org/2020/1/e13756/).

This app is not certified as a medical device and should be used only for general wellbeing or as a home-based complement to more rigorous clinical assessment.

## Build Setup

You need:

- Nodejs
- Apache Cordova

Then run:

``` bash
npm install
cordova prepare
```

## Run

Emulated on web at localhost:8080

``` bash
npm run serve
```

Run it on device:

``` bash
npm run build
cordova run
```


## Deploy


``` bash
npm run build
cordova prepare
cordova build
```

Then you need to sign the app and release it. Seek instructions online on how to do it.

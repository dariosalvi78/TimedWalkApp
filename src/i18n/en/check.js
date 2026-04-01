
export default {
  samplingWarning: `There are too few location points to compute the distance reliably,
  this may be because the screen of your phone was switched off, or because there is low GPS coverage, like indoor.
  <br>
  <b>This test should not be considered valid.</b>
  <br>
  Consider redoing the test when you have recovered.`,
  gapsWarning: `The data recieved contains large gaps, which may lead to an unreliable distance estimation.
  This may be because the screen of your phone was switched off.
  <br>
  <b>This test should not be considered valid.</b>
  <br>
  Consider redoing the test when you have recovered, and make sure to keep the screen on during the test.`,
  curvatureClassWarning: `The path of the test appears to be very irregular, with many turns, which may lead to an unreliable distance estimation.
  This may be because the test was performed in a small area, or by walking back and forth.
  <br>
  <b>This test should not be considered valid.</b>
  <br>
  Consider redoing the test when you have recovered, and make sure to walk in a straight, or gently curved line.`,
}

/*
A simple script that schedules events based on a CSV file.
Currently, CSVs with only two columns are supported. 
The format is based on the export output of Tony: a tool for melody transcription (see https://code.soundsoftware.ac.uk/projects/tony).
The first column contains time in float seconds while the second column contains a number that will be output by the object at the specified time.
*/

const maxAPI = require("max-api");
const NS_PER_SEC = 1e9;

const {chain}  = require('stream-chain');

const {parser} = require('stream-csv-as-json');
const {streamValues} = require('stream-json/streamers/StreamValues');

const fs   = require('fs');

const timer = ms => new Promise(res => setTimeout(res, ms));

var is_playing = false;

function playCsv(fileName, playbackSpeed) {
  // Check for valid playback speeds. Sadly, negative speed is not supported ATM.
  if (isNaN(playbackSpeed) || playbackSpeed <= 0) {
    playbackSpeed = 1.;
  };

  // CSV file streaming pipeline
  var pipeline = chain([
    fs.createReadStream(fileName),
    parser({separator: ','}),
    streamValues(),
    async data => {
      const [time, pitch] = data.value;
      if (time == 'time') {
        // skip the header
        return null;
      }
      // get current time
      let hrtDiff = process.hrtime(startTime);
      // convert hrtime array to float sec
      let hrtDiffFloat = (hrtDiff[0] + (hrtDiff[1] / NS_PER_SEC)) * playbackSpeed;
      // wait
      await timer((time - hrtDiffFloat) * 1000);
      return {t: time, pitch: pitch };
    }
  ]);

  current_pipeline = pipeline;
  is_playing = true;

  var startTime = process.hrtime();
  pipeline.on('data', (d) => {
    if (!is_playing) {
      pipeline.close();
    }
    // output data from an outlet
    maxAPI.outlet(d.pitch);
  }).on('end', () => {
    return {t: -1, pitch: 0}
  });
};

maxAPI.addHandler("play", playCsv);
maxAPI.addHandler("stop", () => {
  is_playing = false;
  maxAPI.outlet(0.)
})

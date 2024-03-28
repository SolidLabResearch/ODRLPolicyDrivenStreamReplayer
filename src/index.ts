import * as fs from 'fs';
const N3 = require('n3');
const file_location = '/home/kush/Code/feather-RDF-mapper/data/rdfData/skt/skt-2min.nt';
const store = new N3.Store();
const stream_parser = new N3.StreamParser();
const stream = require('stream');
import axios from 'axios';

async function replay() {
  const observation = `
  <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <http://rdfs.org/ns/void#inDataset> <https://dahcc.idlab.ugent.be/Protego/_participant1> . <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <https://saref.etsi.org/core/measurementMadeBy> <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/E4.A03846.Thermopile> . <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <http://purl.org/dc/terms/isVersionOf> <https://saref.etsi.org/core/Measurement> . <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <https://saref.etsi.org/core/relatesToProperty> <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearable.skt> . <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <https://saref.etsi.org/core/hasTimestamp> "2024-03-21T08:48:24.2460Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> . <https://dahcc.idlab.ugent.be/Protego/_participant1/obs0> <https://saref.etsi.org/core/hasValue> "32.69"^^<http://www.w3.org/2001/XMLSchema#float> .
  `
  const frequency = 4;
  const replay_seconds = 120;
  await post_observation(observation, frequency, replay_seconds);
}

async function sort() {
}

async function post_observation(observation: string, frequency: number, replay_seconds: number) {
  let count = 0;
  const start_time = new Date().getTime();
  setInterval(async () => {
    const response = await axios.post('http://n061-14a.wall2.ilabt.iminds.be:3000/participant6/skt/1711570652135/', observation, {
      headers: {
        'Content-Type': 'text/turtle'
      }
    });
    count++;
    console.log(response.status);
    console.log('Posted: ', count);
  }, 1000 / frequency);
  if (count >= replay_seconds * frequency) {
    console.log('Done');  
    const end_time = new Date().getTime();
    console.log('Time taken: ', end_time - start_time);
    process.exit(0);
  }
}

function stream_consumer() {
  const writer = stream.Writable({ objectMode: true });
  writer._write = (quad: any, encoding: any, done: () => void) => {
    // console.log(quad);
    store.add(quad);
    done();

  };
  return writer;
}

function mergeSort(list: string[]): string[] {
  if (list.length <= 1) return list;
  let mid = Math.floor(list.length / 2);
  let left: string[] = mergeSort(list.slice(0, mid));
  let right: string[] = mergeSort(list.slice(mid));
  return merge(left, right);
}


function merge(list1: string[], list2: string[]): string[] {
  let merged: string[] = [],
    i: number = 0,
    j: number = 0;
  while (i < list1.length && j < list2.length) {
    let timestamp1 = store.getObjects(N3.namedNode(list1[i]), N3.namedNode('https://saref.etsi.org/core/hasTimestamp'), null)[0].value;
    let timestamp2 = store.getObjects(N3.namedNode(list2[j]), N3.namedNode('https://saref.etsi.org/core/hasTimestamp'), null)[0].value;

    if (timestamp1 < timestamp2) {
      merged.push(list1[i]);
      i++;
    } else {
      merged.push(list2[j]);
      j++;
    }
  }
  while (i < list1.length) {
    merged.push(list1[i]);
    i++;
  }
  while (j < list2.length) {
    merged.push(list2[j]);
    j++;
  }
  return merged;
}

replay();
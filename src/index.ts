import { LDP, LDPCommunication, storeToString } from '@treecg/versionawareldesinldp';
import * as fs from 'fs';
const N3 = require('n3');
import { Quad } from 'n3';
const stream = require('stream');
const { DataFactory } = N3;
export type Resource = Quad[];
let observation_pointer = 0;

const { namedNode, literal, defaultGraph, quad } = DataFactory;

async function main() {
    let store = await load_dataset('/home/kush/Code/feather-RDF-mapper/data/rdfData/skt/skt-2min.nt');
    let sorted_observation_subjects = await sort_observation_store(store);
    const ldp_communication = new LDPCommunication();
    publish_one_observation(sorted_observation_subjects, store, 'http://localhost:3000/aggregation_pod/skt/1711614671461/', ldp_communication);
}

async function sort_observation_store(store: any) {
    const temporary_array = [];
    for (const quad of store.match(null, 'https://saref.etsi.org/core/measurementMadeBy', null)) {
        temporary_array.push(quad);
    }
    const sorted_observation_array = merge_sort(temporary_array, store);
    const reversed_sorted_observation_array = sorted_observation_array.reverse();
    const sorted_observation_subjects = new Array<string>();
    reversed_sorted_observation_array.forEach((quad) => {
        sorted_observation_subjects.push(quad);
    });
    return sorted_observation_subjects;
}

async function publish_one_observation(sorted_observation_subjects: string[], store: any, location_to_publish: string, ldp_communication: LDPCommunication) {
    console.log(`Replaying one observation at the pointer ${observation_pointer}`);
    const observation = JSON.stringify(sorted_observation_subjects[observation_pointer]);
    const observation_object = JSON.parse(observation);
    const store_observation = new N3.Store(store.getQuads(namedNode(observation_object.subject.value), null, null, null))
    let store_observation_string = storeToString(store_observation);
    await ldp_communication.post(location_to_publish, store_observation_string).then((response) => {
        console.log(response.statusText);
    });
    observation_pointer++;
}
async function load_dataset(dataset_location: string) {
    return new Promise((resolve, reject) => {
        const stream_parser = new N3.StreamParser();
        const rdf_stream = fs.createReadStream(dataset_location);
        rdf_stream.pipe(stream_parser);
        const store = new N3.Store();
        stream_parser.pipe(stream_consumer(store));
        stream_parser.on('error', reject);
        stream_parser.on('end', () => {
            resolve(store);
        });
    });
}

function stream_consumer(store: any) {
    const writer = stream.Writable({ objectMode: true });
    writer._write = function (triple: any, encoding: any, done: () => void) {
        store.add(triple);
        done();
    }
    return writer;
}

function number_of_triples(store: any) {
    return store.size;
}

function number_of_observations(store: any) {
    let count = 0;
    for (const quad of store.match(null, namedNode('https://saref.etsi.org/core/measurementMadeBy', null))) {
        count++;
    }
    return count;
}

function merge_sort(array: string[], store: any): string[] {
    if (array.length <= 1) {
        return array;
    }
    let middle = Math.floor(array.length / 2);
    let left: string[] = merge_sort(array.slice(0, middle), store);
    let right: string[] = merge_sort(array.slice(middle), store);
    return merge(left, right, store);
}

function merge(array_one: string[], array_two: string[], store: any): string[] {
    let merged: string[] = [];
    let i: number = 0;
    let j: number = 0;

    while (i < array_one.length && j < array_two.length) {

        let timestamp_one = store.getObjects(namedNode(array_one[i]).id.subject.id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));
        let timestamp_two = store.getObjects(namedNode(array_two[j]).id.subject.id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));

        if (timestamp_one > timestamp_two) {
            merged.push(array_one[i]);
            i++;
        } else {
            merged.push(array_two[j]);
            j++;
        }
    }

    while (i < array_one.length) {
        merged.push(array_one[i]);
        i++;
    }

    while (j < array_two.length) {
        merged.push(array_two[j]);
        j++;
    }

    return merged;
}


main();



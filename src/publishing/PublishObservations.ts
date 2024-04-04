import { LDPCommunication, storeToString } from '@treecg/versionawareldesinldp';
import * as fs from 'fs';
const N3 = require('n3');
import axios from 'axios';
import { StreamConsumer } from './StreamConsumer';
const parser = new N3.Parser();
const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;

export class PublishObservations {
    public ldes_location: string;
    public file_location: string;
    public frequency: number;
    private communication: LDPCommunication;
    private store: any;
    private sort_subject_length: number;
    private stream_consumer: StreamConsumer;
    private initializePromise: Promise<void>;
    private observation_pointer: number;
    private container_to_publish: any;
    private is_ldes: boolean;
    private sorted_observation_subjects!: string[] // This is a string array that will be populated with the sorted observation subjects from the dataset.;

    constructor(ldes_location: string, file_location: string, frequency: number, is_ldes: boolean) {
        this.ldes_location = ldes_location;
        this.store = new N3.Store();
        this.file_location = file_location;
        this.stream_consumer = new StreamConsumer(this.store);
        this.observation_pointer = 0;
        this.is_ldes = is_ldes;
        this.sort_subject_length = 0;
        this.communication = new LDPCommunication();
        this.frequency = frequency;
        this.initializePromise = this.initialize();
    }

    public async initialize() {
        try {
            const store: typeof N3.Store = await this.load_dataset(this.file_location);
            if (this.is_ldes) {
                this.container_to_publish = await this.get_inbox();
                console.log('The inbox is: ' + this.container_to_publish);
            }
            else {
                this.container_to_publish = this.ldes_location;
            }
            const sorted_observation_subjects = await this.sort_observations(store);
            this.sorted_observation_subjects = sorted_observation_subjects;
            return; // This is a promise that resolves when the initialization is done.
        }
        catch (error) {
            console.error(error);
            throw error;
        }
    }

    async load_dataset(file_location: string): Promise<typeof N3.Store> {
        return new Promise((resolve, reject) => {
            const stream_parser = new N3.StreamParser();
            const rdf_stream = fs.createReadStream(file_location);
            rdf_stream.pipe(stream_parser);
            stream_parser.pipe(this.stream_consumer.get_writer());
            stream_parser.on('error', reject);
            stream_parser.on('end', () => {
                resolve(this.store);
            });
        });
    }

    async sort_observations(store: any) {
        const temporary_array = [];
        for (const quad of store.match(null, 'https://saref.etsi.org/core/measurementMadeBy', null)) {
            temporary_array.push(quad.subject.id);
        }
        const sorted_observation_array = this.merge_sort(temporary_array, store);
        const reversed_sorted_observation_array = sorted_observation_array.reverse();
        const sorted_observation_subjects = new Array<string>();
        reversed_sorted_observation_array.forEach((quad) => {
            sorted_observation_subjects.push(quad);
        });
        this.sort_subject_length = sorted_observation_subjects.length;
        return sorted_observation_subjects;
    }

    async publish_one_observation() {
        if (this.observation_pointer > this.sort_subject_length) {
            console.log('All observations have been published.');
            return;
        }
        else {
            try {
                if (this.sorted_observation_subjects[this.observation_pointer]) {
                    const observation = JSON.stringify(this.sorted_observation_subjects[this.observation_pointer]);
                    const observation_object = JSON.parse(observation);
                    this.store.removeQuads(this.store.getQuads(namedNode(observation_object), namedNode('https://saref.etsi.org/core/hasTimestamp'), null, null));
                    const time_now = new Date().toISOString();
                    this.store.addQuad(namedNode(observation_object), namedNode('https://saref.etsi.org/core/hasTimestamp'), literal(time_now));
                    const store_observation = new N3.Store(this.store.getQuads(namedNode(observation_object), null, null, null));
                    const store_observation_string = storeToString(store_observation);
                    await this.communication.post(this.container_to_publish, store_observation_string).then((response) => {
                        if (response.status !== 201) {
                            console.error('The observation could not be posted.');
                        }
                    });
                    this.observation_pointer++;
                    if (this.observation_pointer === this.sort_subject_length) {
                        console.log('All observations have been published.');
                        return;
                    }
                }
            } catch (error) {
                console.log(error);
            }

        }
    }

    async replay_observations() {
        await this.initializePromise;
        if (this.store) {
            if (this.observation_pointer < this.sorted_observation_subjects.length) {
                setInterval(() => {
                    this.publish_one_observation();
                }, 1000 / this.frequency);
            }
            else {
                console.log('No observations to replay');
            }
        }
        else {
            console.error('The store is not defined.');
        }
    }

    merge_sort(array: string[], store: any): string[] {
        if (array.length <= 1) {
            return array;
        }

        let middle = Math.floor(array.length / 2);
        let left: string[] = this.merge_sort(array.slice(0, middle), store);
        let right: string[] = this.merge_sort(array.slice(middle), store);
        return this.merge(left, right, store);
    }

    merge(array_one: string[], array_two: string[], store: any): string[] {
        let merged: string[] = [];
        let i: number = 0;
        let j: number = 0;

        while (i < array_one.length && j < array_two.length) {
            let timestamp_one = store.getObjects(namedNode(array_one[i]).id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));
            let timestamp_two = store.getObjects(namedNode(array_two[j]).id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));

            if (timestamp_one > timestamp_two) {
                merged.push(array_one[i]);
                i++;
            }
            else {
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

    async get_inbox() {
        const inbox = await this.extract_container_to_publish(this.ldes_location);
        if (inbox) {
            this.container_to_publish = inbox;
            return inbox;
        }
        else {
            throw new Error("The inbox could not be extracted.");
        }
    }

    async extract_container_to_publish(ldes_stream_location: string) {
        const store = new N3.Store();
        try {
            const response = await axios.get(ldes_stream_location);
            if (response) {
                await parser.parse(response.data, (error: any, quad: any) => {
                    if (error) {
                        console.error(error);
                        throw new Error("Error while parsing LDES stream.");
                    }
                    if (quad) {
                        store.addQuad(quad);
                    }
                });
                const inbox = store.getQuads(null, 'http://www.w3.org/ns/ldp#inbox', null)[0].object.value;
                return ldes_stream_location + inbox;
            }
            else {
                throw new Error("The response object is empty.");
            }
        } catch (error) {
            console.error(error);
        }
    }
}
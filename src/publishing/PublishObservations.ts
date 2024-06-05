import { LDESinLDP, LDPCommunication, storeToString } from '@treecg/versionawareldesinldp';
import * as fs from 'fs';
const N3 = require('n3');
import axios from 'axios';
import { StreamConsumer } from './StreamConsumer';
import { create_ldp_container, update_latest_inbox } from '../Util';
const parser = new N3.Parser();
const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;

/**
 * The PublishObservations class is a class that is used to publish observations to an LDES stream.
 */
export class PublishObservations {
    public ldes_locations: string[];
    public file_location: string;
    public frequency: number;
    private communication: LDPCommunication;
    private store: any;
    private sort_subject_length: number;
    private stream_consumer: StreamConsumer;
    private initializePromise: Promise<void>;
    private observation_pointer: number;
    private containers_to_publish: string[];
    private time_start_replay: number;
    private tree_path: string;
    private is_ldes: boolean;
    private number_of_post: number;
    private sorted_observation_subjects!: string[] // This is a string array that will be populated with the sorted observation subjects from the dataset.

    /**
     * Constructor for the PublishObservations class.
     * @param {string} ldes_location - The location of the LDES stream.
     * @param {string} file_location - The location of the file.
     * @param {number} frequency - The frequency of the replay.
     * @param {boolean} is_ldes - A boolean that indicates if the stream is an LDES stream.
     */
    constructor(ldes_locations: string[], file_location: string, frequency: number, is_ldes: boolean, tree_path: string) {
        this.ldes_locations = ldes_locations;
        this.store = new N3.Store();
        this.file_location = file_location;
        this.number_of_post = 0;
        this.stream_consumer = new StreamConsumer(this.store);
        this.tree_path = tree_path;
        this.observation_pointer = 0;
        this.containers_to_publish = [];
        this.is_ldes = is_ldes;
        this.sort_subject_length = 0;
        this.time_start_replay = Date.now();
        this.communication = new LDPCommunication();
        this.frequency = frequency;
        this.initializePromise = this.initialize();
    }

    /**
     * Initializes the class by loading the dataset and sorting the observations of PublishObservations.
     * @returns {Promise<void>} - A promise that resolves when the initialization is done.
     */
    public async initialize() {
        try {
            const store: typeof N3.Store = await this.load_dataset(this.file_location);
            for (const ldes_location of this.ldes_locations) {
                if (this.is_ldes) {
                    let ldes_stream = new LDESinLDP(ldes_location, new LDPCommunication());
                    await ldes_stream.initialise({
                        treePath: this.tree_path,
                    });
                    let inbox = await this.get_inbox(ldes_location);
                    console.log(`The inbox for ${ldes_location} is ${inbox}`);
                    this.containers_to_publish.push(inbox);
                }
                else {
                    this.containers_to_publish.push(ldes_location);
                }
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

    /**
     * Loads the dataset from a file into the memory store.
     * @param {string} file_location - The location of the file.
     * @returns {Promise<typeof N3.Store>} - A promise that resolves when the dataset has been loaded.
     */
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

    /**
     * Sorts the observations.
     * @param {any} store - The store to use.
     * @returns {Promise<string[]>} - A promise that resolves when the observations have been sorted.
     */
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

    /**
     * Publishes one observation to the LDES stream.
     * @returns {Promise<void>} - A promise that resolves when the observation has been published.
     */
    async publish_one_observation() {
        if (this.observation_pointer > this.sort_subject_length) {
            console.log('All observations have been published.');
            return;
        }
        else {
            try {
                if (this.sorted_observation_subjects[this.observation_pointer]) {
                    const headers: Headers = new Headers({
                        timeout: '10000',
                    });
                    const observation = JSON.stringify(this.sorted_observation_subjects[this.observation_pointer]);
                    const observation_object = JSON.parse(observation);
                    this.store.removeQuads(this.store.getQuads(namedNode(observation_object), namedNode('https://saref.etsi.org/core/hasTimestamp'), null, null));
                    const time_now = new Date().toISOString();
                    this.store.addQuad(namedNode(observation_object), namedNode('https://saref.etsi.org/core/hasTimestamp'), literal(time_now));
                    const store_observation = new N3.Store(this.store.getQuads(namedNode(observation_object), null, null, null));
                    const store_observation_string = storeToString(store_observation);
                    for (const container of this.containers_to_publish) {
                        await this.communication.post(container, store_observation_string, headers).then((response) => {
                        });
                    }
                    this.observation_pointer++;
                    if (this.observation_pointer === this.sort_subject_length) {
                        console.log(`All observations have been published in time ${Date.now() - this.time_start_replay}`);
                        return;
                    }
                } else {
                }
            } catch (error) {
                console.log(error);
            }

        }
    }

    /**
     * Replays the observations.
     * @returns {Promise<void>} - A promise that resolves when the observations have been replayed.
     */
    async replay_observations() {
        await this.initializePromise;
        if (this.store) {
            console.log('Replaying observations...');
            if (this.observation_pointer < this.sorted_observation_subjects.length) {
                setInterval(() => {
                    this.publish_one_observation();
                }, 1000 / this.frequency);
            }
            else {
                console.log('No observations to replay');
                return;
            }
        }
        else {
            console.error('The store is not defined.');
        }
    }

    /**
     * Merge sort function.
     * @param {string[]} array - The array to sort.
     * @param {any} store - The store to use.
     * @returns {string[]} - The sorted array.
     */
    merge_sort(array: string[], store: any): string[] {
        if (array.length <= 1) {
            return array;
        }

        const middle = Math.floor(array.length / 2);
        const left: string[] = this.merge_sort(array.slice(0, middle), store);
        const right: string[] = this.merge_sort(array.slice(middle), store);
        return this.merge(left, right, store);
    }

    /**
     * Merge function for the merge sort.
     * @param {string[]} array_one - The first array to merge.
     * @param {string[]} array_two - The second array to merge.
     * @param {any} store - The store to use.
     * @returns {string[]} - The merged array.
     */
    merge(array_one: string[], array_two: string[], store: any): string[] {
        const merged: string[] = [];
        let i: number = 0;
        let j: number = 0;

        while (i < array_one.length && j < array_two.length) {
            const timestamp_one = store.getObjects(namedNode(array_one[i]).id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));
            const timestamp_two = store.getObjects(namedNode(array_two[j]).id, namedNode('https://saref.etsi.org/core/hasTimestamp', null));

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

    /**
     * Extracts the inbox from the LDES stream.
     * @returns {string} - The location of the inbox.
     */
    async get_inbox(ldes_location: string) {
        const inbox = await this.extract_container_to_publish(ldes_location);
        if (inbox) {
            return inbox;
        }
        else {
            throw new Error("The inbox could not be extracted.");
        }
    }

    /**
     * Extracts the container to publish from the LDES stream.
     * @param {string} ldes_stream_location - The location of the LDES stream.
     * @returns {string} - The location of the container to publish. 
     */
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

    async check_if_ldes_stream_exists(ldes_stream_location: string) {
        try {
            const response = await axios.get(ldes_stream_location);
            if (response.status === 200) {
                return true;
            }
            else {
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
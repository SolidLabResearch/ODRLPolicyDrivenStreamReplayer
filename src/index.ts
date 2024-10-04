import { Command } from 'commander';
import { PublishObservations } from './publishing/PublishObservations';

// Create a new Commander program
const program = new Command();

// Define the --locations option, which accepts multiple values (as an array)
program
    .option('-fb, --frequency_buffer <frequency_buffer>', 'Frequency of the buffer')
    .option('-f, --frequency', 'Frequency of the stream')
    .option('-file, --file_location', 'File location which is to be published')
    .option('-if_ldes, --if_ldes', 'If the LDES is used')
    .option('-tp, --tree-path <tree_path>', 'TREE path')
    .option('-l, --locations <locations...>', 'Array of locations') // <locations...> allows multiple arguments

// Parse the command-line arguments
program.parse(process.argv);

// Retrieve the options
const options = program.opts();

console.log(options);


// Access the 'locations' array from the options
const locations: string[] = options.locations;
const frequency_buffer: string = options.frequency_buffer;
const frequency: string = options.frequency;
const if_ldes: string = options.if_ldes;
const tree_path: string = options.tree_path;

if (!locations || locations.length === 0) {
    console.error('Please provide locations with -l or --locations.');
} else {
    // const publish_observations = new PublishObservations(locations,)
    // console.log('Locations:', locations);
    // // Process each location
    // locations.forEach(location => {
    //     console.log(`Processing location: ${location}`);
    // });
}

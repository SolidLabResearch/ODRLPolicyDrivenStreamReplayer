import * as json_props from './config/config.json';
import { PublishObservations } from './publishing/PublishObservations';

async function main() {
    new PublishObservations(json_props.location, json_props.file_location, json_props.frequency, json_props.is_ldes).replay_observations();
}

main().then(() => {
    console.log(`Starting the replay of observations`);
});
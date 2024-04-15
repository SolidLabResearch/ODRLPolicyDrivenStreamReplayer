import * as json_props from './config/config.json';
import { PublishObservations } from './publishing/PublishObservations';

/**
 * Starts the replay of observations.
 */
async function main() {
    const publish_observations = new PublishObservations(json_props.location, json_props.file_location, json_props.frequency, json_props.is_ldes, json_props.tree_path);
    await publish_observations.replay_observations();
}

main().then(() => {
    console.log(`Starting the replay of observations`);
});
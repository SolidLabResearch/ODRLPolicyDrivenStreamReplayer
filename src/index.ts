import * as json_props from './config/config.json';
import { PublishObservations } from './publishing/PublishObservations';

async function main() {
    const publish_observation = new PublishObservations(json_props.location, json_props.file_location, json_props.frequency, json_props.is_ldes);
    await publish_observation.replay_observations();
}

main();
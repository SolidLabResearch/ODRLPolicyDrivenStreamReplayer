import * as json_props from './config/config.json';
import { PublishObservations } from './publishing/PublishObservations';

async function main() {
    const publish_observation = new PublishObservations(json_props.ldes_location, json_props.file_location, json_props.frequency);
    await publish_observation.replay_observations();
}

main();
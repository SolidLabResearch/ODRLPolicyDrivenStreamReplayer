import * as json_props from './config/config.json';
import { PublishObservations } from './publishing/PublishObservations';
import * as fs from 'fs';
import { ODRLEventReplayer } from './publishing/ODRLEventReplayer';

/**
 * Starts the replay of observations.
 */

async function main(){
    const publish = new ODRLEventReplayer(json_props.locations, json_props.file_location, json_props.frequency_event, json_props.is_ldes, json_props.tree_path);
    await publish.replay_observations_post_authentication();
}


main().then(() => {
    console.log(`Starting the replay of observations`); 
});


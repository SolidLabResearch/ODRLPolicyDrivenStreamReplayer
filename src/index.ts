import { PublishObservation } from "./PublishObservation";
const program = require('commander');

program
    .version('0.0.1')
    .description('A tool to publish observations to an LDES')
    .name('solid-stream-replay');

program
    .command('replay')
    .description('Replay a stream of observations')
    .option(
        '-l, --ldes <ldes_location>',
        'The location of the LDES Stream',
    )
    .option(
        '-f, --file <file>',
        'The file containing the observations',
    )
    .option(
        '-freq, --frequency <frequency>',
        'The frequency at which the observations should be published',
    )
    .action((cmd: any) => {
        const publish_observation = new PublishObservation(cmd.ldes, cmd.file, cmd.frequency);
        console.log('Replaying observations');
        publish_observation.replay_observations();
    });

program.parse(process.argv);

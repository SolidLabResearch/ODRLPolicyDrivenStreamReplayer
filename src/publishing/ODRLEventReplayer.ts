import { TokenManagerService } from "../service/TokenManagerService";
import { AccessControlService } from "../service/AccessControlService";
import * as dotenv from "dotenv";
import { PublishObservations } from "./PublishObservations";
import { AccessToken } from "../Util";
dotenv.config();

export class ODRLEventReplayer {

    public replay_locations: any;
    public file_to_replay_location: string;
    public frequency_event: number;
    public is_ldes: boolean;
    public webID: string;
    public writing_agent: string | undefined;
    public tree_path: string;
    public purposeForAccess: string | undefined;
    public legalBasis: string | undefined;
    public access_control_service: AccessControlService;
    public token_manager_service: TokenManagerService;

    constructor(replay_locations: any, file_to_replay_location: string, frequency_event: number, if_ldes: boolean, tree_path: string) {
        this.file_to_replay_location = file_to_replay_location;
        this.replay_locations = replay_locations;
        this.frequency_event = frequency_event;
        this.is_ldes = if_ldes;
        this.writing_agent = process.env.STREAM_REPLAYER_LOCATION + "#me";
        this.purposeForAccess = process.env.PURPOSE_FOR_ACCESS
        this.legalBasis = process.env.LEGAL_BASIS + "#A9-2-a" // for GDPR access
        this.tree_path = tree_path;
        this.webID = this.generateWebID(replay_locations)
        this.access_control_service = new AccessControlService(this.writing_agent, replay_locations, this.webID);
        this.token_manager_service = TokenManagerService.getInstance();
    }

    async replay_observations_post_authentication() {
        if (this.purposeForAccess && this.legalBasis) {            
            if (await (this.access_control_service.authorizeRequest(this.purposeForAccess, this.legalBasis))) {
                let { access_token, token_type } = this.token_manager_service.getAccessToken();
                if (access_token && token_type) {
                    console.log(`Writing access is granted`);
                    const token: AccessToken = {
                        token: access_token,
                        token_type: token_type
                    };
                    const publish_observations = new PublishObservations([this.replay_locations], this.file_to_replay_location, this.frequency_event, this.frequency_event, this.is_ldes, this.tree_path);
                    publish_observations.replay_observations(token);
                }
            } else {
                throw new Error("The access token is not defined for the authorization request");
            }

        }
        else {
            throw new Error("The purpose for access and the legal basis isn't set up in the .env configuration file");
        }
    }

    generateWebID(url: string): string {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(Boolean); // Remove empty parts

        if (parts.length < 2) {
            throw new Error("Invalid URL structure");
        }

        const basePath = parts[0]; // Extract the base pod path (e.g., "pod1")
        return `${urlObj.origin}/${basePath}/profile/card#me`;
    }
}
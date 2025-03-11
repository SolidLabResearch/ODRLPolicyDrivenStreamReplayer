import { TokenManagerService } from "./TokenManagerService";
import jwt from "jsonwebtoken";
import { makeAuthenticatedFetch } from "./CSSAuthentication";
import { randomUUID } from 'crypto';
export class AccessControlService {

    public writing_agent: string | undefined;
    public solid_pod_webID: string;
    public token_manager_service: TokenManagerService;
    public resources_to_write: string[];
    public terms = {
        solid: {
            umaServer: 'http://www.w3.org/ns/solid/terms#umaServer',
            location: 'http://www.w3.org/ns/solid/terms#location',
            viewIndex: 'http://www.w3.org/ns/solid/terms#viewIndex',
            entry: 'http://www.w3.org/ns/solid/terms#entry'
        },
        scopes: {
            read: 'urn:example:css:modes:read',
            write: 'urn:example:css:modes:write'
        }
    }


    private valid_authentication_tokens = new Map<string, string>();

    public addAuthenticationToken(user_webID: string, token: string) {
        this.valid_authentication_tokens.set(user_webID, token);
    }

    public getAuthenticationToken(user_webID: string): string {
        const authentication_token = this.valid_authentication_tokens.get(user_webID);
        if (authentication_token) {
            return authentication_token;
        }
        else {
            throw new Error("No authentication token was found for the user");
        }
    }

    constructor(writing_agent: string | undefined, resources_to_write: string[], solid_pod_webID: string) {
        this.resources_to_write = resources_to_write;
        this.writing_agent = writing_agent;
        this.solid_pod_webID = solid_pod_webID;
        this.token_manager_service = TokenManagerService.getInstance();
    }

    async fetchUMAResourceServer(patient_webId: string) {
        const patientProfile = await (await fetch(patient_webId)).json();
        const umaServer = patientProfile[this.terms.solid.umaServer];
        return umaServer;
    }

    async getPolicy(policy: string): Promise<string> {
        return policy;
    }

    async authorizeRequest(purposeForWriting: string, legalBasis: string): Promise<boolean> {
        for (let resource of this.resources_to_write) {
            const fetch_response = await fetch(resource, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const umaHeader = await fetch_response.headers.get('WWW-Authenticate');
            console.log(`The resource request is done without any authorization with the UMA flow. It should result in a 401 response with an ${umaHeader} header.`);
            let authorization_server_uri = umaHeader?.split('as_uri=')[1].split('"')[1];
            let authorization_ticket = umaHeader?.split('ticket=')[1].replace(/"/g, '');
            console.log(`The authorization server URI is ${authorization_server_uri} and the ticket is ${authorization_ticket}.`);
            if (!authorization_server_uri) {
                throw new Error(`authorization_server_uri is missing. Parsed from header: ${umaHeader}`);
            }
            let authorization_server_uma_config = await (await fetch(`${authorization_server_uri}/.well-known/uma2-configuration`)).json();
            const token_endpoint = authorization_server_uma_config.token_endpoint;
            const claim_jwt_token = this.generateJWTToken(purposeForWriting, this.writing_agent, legalBasis);
            const writingRequestWithODRLClaims = this.generateWritingAccessWithODRLClaims(this.writing_agent, resource, authorization_ticket, purposeForWriting, legalBasis, claim_jwt_token);

            const monitoringServiceWritingResponseWithClaims = await fetch(token_endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(writingRequestWithODRLClaims)
            });

            const tokenParameters = await monitoringServiceWritingResponseWithClaims.json();

            const accessWithTokenResponse = await fetch(resource, {
                headers: {
                    'Authorization': `${tokenParameters.token_type} ${tokenParameters.access_token}`
                }
            });

            if (accessWithTokenResponse.status !== 200) {
                console.log(`The request is unsuccessful and the monitoring service is not authorized to access the resource.`);
                return false; // Return false immediately if any iteration fails
            }

            this.token_manager_service.setAccessToken(tokenParameters.access_token, tokenParameters.token_type);
            console.log(`The request is successful and the monitoring service is authorized to access the resource.`);
        }

        return true; // Return true only if all iterations succeed

    }

    generateJWTToken(purposeForWriting: string, requesting_agent: string | undefined, legalBasis: string) {
        const data_request_claims: any = {
            "http://www.w3.org/ns/odrl/2/purpose": purposeForWriting,
            "urn:solidlab:uma:claims:types:webid": requesting_agent,
            "https://w3id.org/oac#LegalBasis": legalBasis,
        };
        // Now Generating a JWT (HS256; secret: "ceci n'est pas un secret")
        const claim_jwt_token = jwt.sign(data_request_claims, 'ceci n\'est pas un secret', { algorithm: 'HS256' });
        return claim_jwt_token;
    }

    generateWritingAccessWithODRLClaims(requesting_agent: string | undefined, resource_to_write: string, authorization_ticket: string | undefined, purposeForWriting: string, legalBasis: string, claim_jwt_token: string) {
        const writingAccessWithODRLClaims = {
            "@context": "https://www.w3.org/ns/odrl.jsonld",
            "@type": "Request",
            profile: { "@id": "https://w3id.org/oac#" },
            uid: `http://example.org/writing-request/${randomUUID()}`,
            description: `Request for the replayer service to have writing access to ${resource_to_write}`,
            permission: [
                {
                    "@type": "Permission",
                    "@id": `http://example.org/monitoring-request-permission/${randomUUID()}`,
                    target: resource_to_write,
                    action: { "@id": "https://w3id.org/oac#write" },
                    assigner: this.solid_pod_webID,
                    assignee: requesting_agent,
                    constraint: [
                        {
                            "@type": "Constraint",
                            "@id": `http://example.org/stream-replay-write-permission-purpose/${randomUUID()}`,
                            leftOperand: "purpose",
                            operator: "eq",
                            rightOperand: { "@id": `${purposeForWriting}` }
                        },
                        {
                            "@type": "Constraint",
                            "@id": `http://example.org/stream-replay-write-permission-purpose/${randomUUID()}`,
                            leftOperand: { "@id": "https://w3id.org/oac#LegalBasis" },
                            operator: "eq",
                            rightOperand: { "@id": `${legalBasis}` },
                        }
                    ]
                }
            ],
            claim_token: claim_jwt_token,
            claim_token_format: "urn:solidlab:uma:claims:formats:jwt",
            grant_type: "urn:ietf:params:oauth:grant-type:uma-ticket",
            ticket: authorization_ticket
        };

        return writingAccessWithODRLClaims;
    }

    async authenticateRequest(writing_agent: string, resource_to_write: string): Promise<boolean> {
        const user_authentication_token = this.getAuthenticationToken(writing_agent);
        if (user_authentication_token) {
            const authenticatedFetchRequest = await makeAuthenticatedFetch(user_authentication_token, fetch);
            const response = await authenticatedFetchRequest(resource_to_write, {
                method: 'GET'
            });

            if (response.status === 200) {
                console.log(`The user ${writing_agent} is authenticated to access the resource ${resource_to_write}.`);
                return true;
            }

            else {
                console.log(`The user ${writing_agent} is not authenticated to access the resource ${resource_to_write}.`);
                return false;
            }
        }
        else {
            throw new Error("No authentication token found for the user. Please create an authentication token first.");

        }
    }
}
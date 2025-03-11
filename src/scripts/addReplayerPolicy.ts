const read_policy_for_service = `
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX eu-gdpr: <https://w3id.org/dpv/legal/eu/gdpr#>
PREFIX oac: <https://w3id.org/oac#>
PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

PREFIX ex: <http://example.org/>

<http://example.org/ReplayerWritingRequest> a odrl:Request ;
    odrl:uid ex:ReplayerWritingRequest ;
    odrl:profile oac: ;
    dcterms:description "The stream replayer replays a dataset to a pod container.";
    odrl:permission <http://example.org/writing-request-permission> .

<http://example.org/writing-request-permission> a odrl:Permission ;
    odrl:action odrl:write ;
    odrl:target <http://n063-02b.wall2.ilabt.iminds.be:3000/pod1/acc-x/> ;
    odrl:assigner <http://n063-02b.wall2.ilabt.iminds.be:3000/pod1/profile/card#me> ;
    odrl:assignee <http://n063-04b.wall2.ilabt.iminds.be/replayer#me> ;
    odrl:constraint <http://example.org/stream-replay-write-permission-purpose>,
        <http://example.org/stream-replay-write-permission-lb/> .

<http://example.org/stream-replay-write-permission-purpose> a odrl:Constraint ;
    odrl:leftOperand odrl:purpose ; # can also be oac:Purpose, to conform with OAC profile
    odrl:operator odrl:eq ;
    odrl:rightOperand ex:sensorWriteForMonitoring .

<http://example.org/stream-replay-write-permission-lb/> a odrl:Constraint ;
    odrl:leftOperand oac:LegalBasis ;
    odrl:operator odrl:eq ;
    odrl:rightOperand eu-gdpr:A9-2-a .`
    ;

const policy_location = `http://n063-02b.wall2.ilabt.iminds.be:3000/pod1/settings/policies/`;

async function main() {
    const response = await fetch(policy_location, {
        method: 'POST',
        headers: { 'content-type': 'text/turtle' },
        body: read_policy_for_service,
    });

    if (response.status === 200 || response.status === 201) {
        console.log(`POST policy has been done succesfully`);
    }
    else {
        console.log(`POST Policy has failed.`);
    }
}

main();
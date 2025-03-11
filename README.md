# ODRL Policy Driven Stream Replayer

The ODRL Policy Driven Strean is a service which generates a stream of events and publishes them to an LDP container of a Solid Pod via the HTTP protocol. The events are generated for different sensors, and the normal and abnormal events with values for the sensors are generated with a predefined noise level. 

The ODRL Policy Driven Stream Replayer utilizes the User Managed Access (UMA) flow with ODRL to make sure only authorized agents can write and read the data from the Solid Pod. 

## Usage

### Installation

```bash
npm install
```

### Running the UMA server

A seperate authorization server which supports User Managed Access needs to run with the Solid Pod's WebID containing the information to reach the particular UMA server. The Solid Pod should contain policies defining the write access for the ODRL Policy Driven Stream Replayer Service.

The authorization server is available [here](https://github.com/SolidLabResearch/user-managed-access/tree/project/pacsoi-poc1) where it should be downloaded.

### Building

Now, we navigate to the `src/config` folder and update the `config.json` file with the parameters defined below.

```json
{
    "ldp_containers": [
        {
            "url": "https://pod.example.org/containerX/",
            "frequency": 2
        },
        {
            "url": "https://pod.example.org/containerY/",
            "frequency": 6
        }
    ]
}
```

The `ldp_containers` parameter is an array of the locations of the LDP containers where the events will be published. The `url`  The `frequency` parameter is the frequency at which the events will be published from the sensors.

Now, build the project using the following command:

```bash
npm run build
```

### Starting the Stream Replayer
To start the anomaly generation event stream, use the following command:

```bash
npm run start
```

## License

This code is copyrighted by [Ghent University - imec](https://www.ugent.be/ea/idlab/en) and released under the [MIT Licence](./LICENCE.md)


## Contact

For any questions, please contact [Kush](mailto:kushagrasingh.bisen@ugent.be) or create an issue in the repository.

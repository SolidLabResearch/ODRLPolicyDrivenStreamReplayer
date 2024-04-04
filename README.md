# KISS Solid Stream Replayer

A simpler sensor data replayer to the inbox of an LDES in LDP.

## Usage

### Installation

```bash
npm install
```

### Building

Now, navigate to the `src/config` folder and update the `config.json` file with the required parameters.

```json
{
    "ldes_location": "insert_ldes_location_here",
    "frequency": 4, // number of events per second
    "file_location": "insert_file_location_here",
}
```

Now, build the project using the following command:

```bash
npm run build
```

### Running

To run the project, use the following command:

```bash
npm run start
```

## License

This code is copyrighted by [Ghent University - imec](https://www.ugent.be/ea/idlab/en) and released under the [MIT Licence](./LICENCE.md) 

## Contact

For any questions, please contact [Kush](mailto:kushagrasingh.bisen@ugent.be) or create an issue in the repository.
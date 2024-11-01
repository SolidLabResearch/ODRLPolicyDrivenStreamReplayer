import csv

# Define the file paths for each URI type
output_files = {
    "acc-x": "/home/kush/Code/RSP/solid-stream-aggregator-evaluation/acc_x.csv",
    "acc-y": "/home/kush/Code/RSP/solid-stream-aggregator-evaluation/acc_y.csv",
    "acc-z": "/home/kush/Code/RSP/solid-stream-aggregator-evaluation/acc_z.csv"
}

# Open each output file
output_writers = {}
for key, filename in output_files.items():
    f = open(filename, "w", newline="")
    writer = csv.writer(f, delimiter=",")
    writer.writerow(["timestamp", "sequence_number", "uri"])  # Write header
    output_writers[key] = writer

# Read the original data and filter based on URI
with open("/home/kush/Code/RSP/solid-stream-aggregator-evaluation/output.csv", "r") as infile:
    reader = csv.DictReader(infile, delimiter=",")
    for row in reader:
        if "acc-x" in row["uri"]:
            output_writers["acc-x"].writerow([row["timestamp"], row["sequence_number"], row["uri"]])
        elif "acc-y" in row["uri"]:
            output_writers["acc-y"].writerow([row["timestamp"], row["sequence_number"], row["uri"]])
        elif "acc-z" in row["uri"]:
            output_writers["acc-z"].writerow([row["timestamp"], row["sequence_number"], row["uri"]])

# Close the output files
for f in output_files.values():
    f.close()

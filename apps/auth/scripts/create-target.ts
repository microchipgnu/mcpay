const target = process.argv[2];

if (!target) {
    console.error("Target is required");
    process.exit(1);
}

// Encode the target using encodeURIComponent, then base64 encode it
const encoded = btoa(encodeURIComponent(target));
console.log(encoded);
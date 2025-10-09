import { pinggy } from "@pinggy/pinggy";

const tunnel = pinggy.createTunnel({ forwardTo: "localhost:3050" });
await tunnel.start();
console.log("Tunnel URLs:", tunnel.urls()); 


// https://phnxm-81-84-138-166.a.free.pinggy.link/mcp?target-url=ZDY3YWFmMGQtZmNjOC00MTM2LTk0OGQtYzQ3MGFiZTQxYWMw